//! 敲木鱼的声音：用代码现场合成一个短促的木头声，交给系统音频（cpal：macOS CoreAudio、Windows WASAPI）播放。
//! 不用音频文件，也不经过网页里的 Web Audio（v0.3.0 用 Web Audio，在正式版里听不到）。
//!
//! 木头声 = 三个很快衰减的正弦（木腔共鸣，基音带一点下滑）+ 一下 12ms 的带通噪声（敲击的「嗒」）。

use std::{thread, time::Duration};

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::{FromSample, SizedSample};

/// 总长（秒）
const LENGTH: f32 = 0.25;
const VOLUME: f32 = 0.6;

/// 合成一声木鱼，单声道，返回 sample_rate 采样率下的样本（-1..1）
pub fn samples(sample_rate: u32) -> Vec<f32> {
    let sr = sample_rate as f32;
    let n = (LENGTH * sr) as usize;
    let mut out = vec![0f32; n];

    // 木腔：(频率, 音量, 衰减到几乎无声的时间)
    for &(freq, gain, decay) in &[(560.0f32, 0.9f32, 0.16f32), (1180.0, 0.35, 0.08), (1890.0, 0.15, 0.05)] {
        let mut phase = 0f32;
        for (i, s) in out.iter_mut().enumerate() {
            let t = i as f32 / sr;
            if t > decay + 0.02 {
                break;
            }
            // 频率 30ms 内从 1.04 倍指数滑到原频率
            let f = if t < 0.03 { freq * 1.04f32.powf(1.0 - t / 0.03) } else { freq };
            phase += 2.0 * std::f32::consts::PI * f / sr;
            // 包络：3ms 指数升到 gain，再指数衰减到 0.0001
            let env = if t < 0.003 {
                0.0001 * (gain / 0.0001f32).powf(t / 0.003)
            } else if t < decay {
                gain * (0.0001 / gain).powf((t - 0.003) / (decay - 0.003))
            } else {
                0.0
            };
            *s += phase.sin() * env;
        }
    }

    // 敲击：12ms 噪声，线性淡出，过 2400Hz、Q=1.2 的带通（RBJ 双二阶）
    let len = (0.012 * sr) as usize;
    let (f0, q) = (2400.0f32, 1.2f32);
    let w0 = 2.0 * std::f32::consts::PI * f0 / sr;
    let alpha = w0.sin() / (2.0 * q);
    let a0 = 1.0 + alpha;
    let (b0, b2, a1, a2) = (alpha / a0, -alpha / a0, -2.0 * w0.cos() / a0, (1.0 - alpha) / a0);
    let (mut x1, mut x2, mut y1, mut y2) = (0f32, 0f32, 0f32, 0f32);
    let mut seed: u32 = 0x9e37_79b9;
    for (i, s) in out.iter_mut().enumerate() {
        let x = if i < len {
            // xorshift 伪随机
            seed ^= seed << 13;
            seed ^= seed >> 17;
            seed ^= seed << 5;
            ((seed as f32 / u32::MAX as f32) * 2.0 - 1.0) * (1.0 - i as f32 / len as f32)
        } else {
            0.0
        };
        let y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        *s += 0.5 * y;
    }

    for s in out.iter_mut() {
        *s = (*s * VOLUME).clamp(-1.0, 1.0);
    }
    out
}

/// 在后台线程里敲一下：delay 之后响，响完关掉音频流
pub fn play(delay: Duration) {
    thread::spawn(move || {
        thread::sleep(delay);
        if let Err(err) = play_blocking() {
            eprintln!("木鱼声播放失败：{err}");
        }
    });
}

fn play_blocking() -> Result<(), String> {
    let device = cpal::default_host().default_output_device().ok_or("没有默认输出设备")?;
    let config = device.default_output_config().map_err(|e| e.to_string())?;
    match config.sample_format() {
        cpal::SampleFormat::F32 => run::<f32>(&device, &config.into()),
        cpal::SampleFormat::I16 => run::<i16>(&device, &config.into()),
        cpal::SampleFormat::U16 => run::<u16>(&device, &config.into()),
        cpal::SampleFormat::I32 => run::<i32>(&device, &config.into()),
        other => Err(format!("不支持的采样格式 {other:?}")),
    }
}

fn run<T: SizedSample + FromSample<f32>>(device: &cpal::Device, config: &cpal::StreamConfig) -> Result<(), String> {
    let wave = samples(config.sample_rate);
    let channels = config.channels as usize;
    let mut pos = 0usize;
    let stream = device
        .build_output_stream(
            config.clone(),
            move |data: &mut [T], _| {
                for frame in data.chunks_mut(channels) {
                    let v = wave.get(pos).copied().unwrap_or(0.0);
                    pos += 1;
                    for s in frame {
                        *s = T::from_sample(v);
                    }
                }
            },
            |err| eprintln!("木鱼声输出出错：{err}"),
            None,
        )
        .map_err(|e| e.to_string())?;
    stream.play().map_err(|e| e.to_string())?;
    thread::sleep(Duration::from_secs_f32(LENGTH + 0.1));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 合成出来的是一声短促、响亮的木头声
    #[test]
    fn synthesized_knock_is_short_and_loud() {
        let s = samples(48_000);
        assert_eq!(s.len(), 12_000);
        let peak = s.iter().fold(0f32, |m, v| m.max(v.abs()));
        assert!(peak > 0.3 && peak <= 1.0, "峰值 {peak}");
        // 前 50ms 有声，200ms 以后基本没声
        let rms = |a: &[f32]| (a.iter().map(|v| v * v).sum::<f32>() / a.len() as f32).sqrt();
        assert!(rms(&s[..2_400]) > 0.05);
        assert!(rms(&s[9_600..]) < 0.001);
    }

    /// 真的从扬声器放一声（手动跑：cargo test woodblock -- --ignored）
    #[test]
    #[ignore]
    fn play_through_speakers() {
        play_blocking().unwrap();
    }
}
