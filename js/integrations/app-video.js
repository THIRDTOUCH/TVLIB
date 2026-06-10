class VideoGenerator {
  constructor() {
    this.services = {
      runway: {
        name: 'Runway ML',
        icon: '🎬',
        url: 'https://api.runwayml.com/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: true,
        freeTier: true
      },
      pika: {
        name: 'Pika Labs',
        icon: '✨',
        url: 'https://api.pika.art/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: true,
        freeTier: true
      },
      sora: {
        name: 'OpenAI Sora',
        icon: '🌀',
        url: 'https://api.openai.com/v1',
        supportsTextToVideo: true,
        supportsImageToVideo: false,
        supportsVideoToVideo: false,
        requiresKey: true,
        freeTier: false
      },
      ffmpeg: {
        name: '本地 FFmpeg',
        icon: '💻',
        url: null,
        supportsTextToVideo: false,
        supportsImageToVideo: true,
        supportsVideoToVideo: true,
        requiresKey: false,
        freeTier: true
      }
    };

    this.currentService = 'runway';
    this.apiKeys = {};
    this._status = 'idle';
    this._progressCallback = null;
  }

  setService(serviceId) {
    if (this.services[serviceId]) {
      this.currentService = serviceId;
    }
  }

  setAPIKey(serviceId, key) {
    this.apiKeys[serviceId] = key;
    localStorage.setItem(`video_api_key_${serviceId}`, key);
  }

  getAPIKey(serviceId) {
    return this.apiKeys[serviceId] || localStorage.getItem(`video_api_key_${serviceId}`) || '';
  }

  getAvailableServices() {
    return Object.keys(this.services).map(id => ({
      id,
      ...this.services[id]
    }));
  }

  async textToVideo(prompt, options = {}) {
    const service = this.services[this.currentService];
    if (!service.supportsTextToVideo) {
      throw new Error(`${service.name} 不支持文本生成视频`);
    }

    if (service.requiresKey && !this.getAPIKey(this.currentService)) {
      throw new Error(`${service.name} 需要配置 API Key`);
    }

    this._status = 'generating';
    this._notifyProgress(0, '开始生成视频...');

    try {
      let result;
      
      switch (this.currentService) {
        case 'runway':
          result = await this._runwayTextToVideo(prompt, options);
          break;
        case 'pika':
          result = await this._pikaTextToVideo(prompt, options);
          break;
        case 'sora':
          result = await this._soraTextToVideo(prompt, options);
          break;
        default:
          throw new Error('不支持的服务');
      }

      this._status = 'completed';
      this._notifyProgress(100, '视频生成完成');
      return result;
    } catch (error) {
      this._status = 'error';
      this._notifyProgress(-1, `生成失败: ${error.message}`);
      throw error;
    }
  }

  async imageToVideo(imageUrl, options = {}) {
    const service = this.services[this.currentService];
    if (!service.supportsImageToVideo) {
      throw new Error(`${service.name} 不支持图片生成视频`);
    }

    this._status = 'generating';
    this._notifyProgress(0, '开始生成视频...');

    try {
      let result;

      if (this.currentService === 'ffmpeg') {
        result = await this._ffmpegImageSequenceToVideo(imageUrl, options);
      } else {
        result = await this._apiImageToVideo(imageUrl, options);
      }

      this._status = 'completed';
      this._notifyProgress(100, '视频生成完成');
      return result;
    } catch (error) {
      this._status = 'error';
      this._notifyProgress(-1, `生成失败: ${error.message}`);
      throw error;
    }
  }

  async storyboardToVideo(storyboardData, options = {}) {
    if (!storyboardData || !storyboardData.shots) {
      throw new Error('无效的故事板数据');
    }

    this._status = 'generating';
    const totalShots = storyboardData.shots.length;
    const results = [];

    for (let i = 0; i < totalShots; i++) {
      const shot = storyboardData.shots[i];
      const progress = (i / totalShots) * 50;
      this._notifyProgress(progress, `正在生成分镜 ${i + 1}/${totalShots}...`);

      try {
        const videoUrl = await this.textToVideo(shot.prompt, {
          duration: shot.duration || 3,
          ...options
        });
        results.push({ shotId: shot.id, videoUrl });
      } catch (error) {
        console.warn(`分镜 ${i + 1} 生成失败:`, error);
        results.push({ shotId: shot.id, videoUrl: null, error: error.message });
      }
    }

    this._notifyProgress(75, '正在合并视频...');
    
    if (results.every(r => r.videoUrl)) {
      const mergedUrl = await this.mergeVideos(results.map(r => r.videoUrl), options);
      this._notifyProgress(100, '视频合并完成');
      return { individualVideos: results, mergedVideo: mergedUrl };
    }

    this._status = 'completed';
    return { individualVideos: results, mergedVideo: null };
  }

  async mergeVideos(videoUrls, options = {}) {
    if (videoUrls.length === 1) {
      return videoUrls[0];
    }

    if (this.currentService === 'ffmpeg' && window.FFmpeg) {
      return this._ffmpegMergeVideos(videoUrls, options);
    }

    return videoUrls[0];
  }

  async _runwayTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('runway');
    const url = `${this.services.runway.url}/generate/video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        duration: options.duration || 10,
        width: options.width || 1024,
        height: options.height || 576,
        model: options.model || 'gen-3-alpha'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.result?.url,
      taskId: data.task_id,
      duration: options.duration
    };
  }

  async _pikaTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('pika');
    const url = `${this.services.pika.url}/text-to-video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        duration: options.duration || 3,
        aspect_ratio: options.aspectRatio || '16:9',
        quality: options.quality || 'standard'
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.url,
      taskId: data.id,
      duration: options.duration
    };
  }

  async _soraTextToVideo(prompt, options) {
    const apiKey = this.getAPIKey('sora');
    const url = `${this.services.sora.url}/videos/generations`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'sora',
        prompt,
        duration: options.duration || 10,
        size: `${options.width || 1024}x${options.height || 576}`
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || '生成失败');
    }

    return {
      videoUrl: data.data[0]?.url,
      taskId: data.id,
      duration: options.duration
    };
  }

  async _apiImageToVideo(imageUrl, options) {
    const service = this.services[this.currentService];
    const apiKey = this.getAPIKey(this.currentService);
    const url = `${service.url}/image-to-video`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_url: imageUrl,
        duration: options.duration || 5,
        motion: options.motion || 1
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || '生成失败');
    }

    return {
      videoUrl: data.result?.url || data.url,
      taskId: data.task_id || data.id,
      duration: options.duration
    };
  }

  async _ffmpegImageSequenceToVideo(imageUrl, options) {
    if (!window.FFmpeg) {
      throw new Error('FFmpeg 库未加载');
    }

    const { createFFmpeg, fetchFile } = window.FFmpeg;
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      ffmpeg.FS('writeFile', 'input.png', uint8Array);

      const duration = options.duration || 5;
      const fps = 1;

      await ffmpeg.run(
        '-loop', '1',
        '-i', 'input.png',
        '-c:v', 'libx264',
        '-t', duration.toString(),
        '-r', fps.toString(),
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      );

      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      return {
        videoUrl: url,
        duration,
        local: true
      };
    } finally {
      ffmpeg.FS('unlink', 'input.png');
      ffmpeg.FS('unlink', 'output.mp4');
      ffmpeg.exit();
    }
  }

  async _ffmpegMergeVideos(videoUrls, options) {
    if (!window.FFmpeg) {
      throw new Error('FFmpeg 库未加载');
    }

    const { createFFmpeg, fetchFile } = window.FFmpeg;
    const ffmpeg = createFFmpeg({ log: false });
    await ffmpeg.load();

    try {
      const fileList = [];
      for (let i = 0; i < videoUrls.length; i++) {
        const response = await fetch(videoUrls[i]);
        const arrayBuffer = await response.arrayBuffer();
        const fileName = `input_${i}.mp4`;
        ffmpeg.FS('writeFile', fileName, new Uint8Array(arrayBuffer));
        fileList.push(fileName);
      }

      const listContent = fileList.map(f => `file '${f}'`).join('\n');
      ffmpeg.FS('writeFile', 'filelist.txt', new TextEncoder().encode(listContent));

      await ffmpeg.run(
        '-f', 'concat',
        '-safe', '0',
        '-i', 'filelist.txt',
        '-c', 'copy',
        'output.mp4'
      );

      const data = ffmpeg.FS('readFile', 'output.mp4');
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      return {
        videoUrl: url,
        local: true
      };
    } finally {
      fileList.forEach(f => ffmpeg.FS('unlink', f));
      ffmpeg.FS('unlink', 'filelist.txt');
      ffmpeg.FS('unlink', 'output.mp4');
      ffmpeg.exit();
    }
  }

  setProgressCallback(callback) {
    this._progressCallback = callback;
  }

  _notifyProgress(progress, message) {
    if (this._progressCallback) {
      this._progressCallback({ progress, message, status: this._status });
    }
  }

  getStatus() {
    return this._status;
  }

  async downloadVideo(videoUrl, filename = 'video.mp4') {
    const response = await fetch(videoUrl);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  generateShotPrompts(storyboardData) {
    if (!storyboardData || !storyboardData.shots) {
      return [];
    }

    return storyboardData.shots.map((shot, index) => {
      let prompt = `Scene ${index + 1}: ${shot.scene || 'Unknown Scene'}\n`;
      
      if (shot.visual) {
        prompt += `${shot.visual}\n`;
      }
      
      if (shot.character) {
        prompt += `Characters: ${shot.character}\n`;
      }
      
      if (shot.action) {
        prompt += `Action: ${shot.action}\n`;
      }
      
      if (shot.camera) {
        prompt += `Camera: ${shot.camera}\n`;
      }
      
      if (shot.mood) {
        prompt += `Mood: ${shot.mood}\n`;
      }
      
      prompt += 'Style: cinematic, high quality, movie scene';
      
      return {
        shotId: shot.id,
        prompt: prompt.trim(),
        duration: shot.duration || 3,
        aspectRatio: shot.aspectRatio || '16:9'
      };
    });
  }
}

const VideoManager = new VideoGenerator();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VideoGenerator, VideoManager };
}