import JSZip from 'jszip';
import { GeneratedImage } from '../types';

export async function exportImagesToZip(
  images: GeneratedImage[],
  zipFilename: string = `seedream_images_${Date.now()}.zip`,
  onProgress?: (progress: number, status: string) => void
): Promise<void> {
  if (!images || images.length === 0) {
    throw new Error('未选择任何图片');
  }

  const zip = new JSZip();
  const folder = zip.folder('images');
  const manifestItems: any[] = [];
  const promptsLines: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const indexStr = String(i + 1).padStart(3, '0');
    // Shorten prompt for filename safe string
    const safePrompt = item.prompt
      .replace(/[\\/:*?"<>|]/g, '')
      .slice(0, 15)
      .trim();
    const filename = `${indexStr}_${safePrompt || 'seedream'}.jpg`;

    if (onProgress) {
      onProgress(
        Math.round(((i + 0.2) / images.length) * 100),
        `正在下载打包第 ${i + 1}/${images.length} 张图片...`
      );
    }

    try {
      let imageBuffer: ArrayBuffer | null = null;

      if (item.imageUrl.startsWith('data:image/')) {
        // Base64 Data URL
        const base64Data = item.imageUrl.split(',')[1];
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }
        imageBuffer = bytes.buffer;
      } else {
        // Remote URL fetch
        try {
          const response = await fetch(item.imageUrl);
          if (!response.ok) {
            throw new Error(`下载失败 HTTP ${response.status}`);
          }
          imageBuffer = await response.arrayBuffer();
        } catch (fetchErr: any) {
          console.warn(`Direct fetch failed for ${item.id}:`, fetchErr);
          // If direct fetch is blocked by CORS, write an HTML direct shortcut file
          if (folder) {
            folder.file(
              `${filename}.html`,
              `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title><meta http-equiv="refresh" content="0; url=${item.imageUrl}"></head><body><p>正在跳转至原图: <a href="${item.imageUrl}" target="_blank">${item.imageUrl}</a></p></body></html>`
            );
          }
        }
      }

      if (imageBuffer && folder) {
        folder.file(filename, imageBuffer);
      }

      manifestItems.push({
        index: i + 1,
        filename: imageBuffer ? filename : `${filename}.html (在线链接)`,
        imageUrl: item.imageUrl,
        prompt: item.prompt,
        negativePrompt: item.negativePrompt || '',
        model: item.model,
        size: item.size,
        createdAt: new Date(item.createdAt).toISOString(),
        parameters: item.parameters,
      });

      promptsLines.push(`[${indexStr}] ${item.prompt}`);
    } catch (err: any) {
      console.warn(`打包图片 ${item.id} 遇到问题:`, err);
      // Still log in manifest
      manifestItems.push({
        index: i + 1,
        filename: `${filename} (download failed: ${err.message})`,
        imageUrl: item.imageUrl,
        prompt: item.prompt,
        model: item.model,
      });
    }

  }

  // Add manifest and prompts files
  zip.file('manifest.json', JSON.stringify(manifestItems, null, 2));
  zip.file('prompts.txt', promptsLines.join('\n\n'));

  if (onProgress) {
    onProgress(95, '正在压缩生成 ZIP 归档包...');
  }

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  if (onProgress) {
    onProgress(100, '下载准备就绪');
  }

  // Trigger browser download
  const blobUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = zipFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
