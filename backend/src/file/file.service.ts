import { Inject, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class FileService {
  async uploadFile(file: Express.Multer.File) {
    const result = await cloudinary.uploader.upload(file.path);
    return result.public_id;
  }

  async readFile(publicId: string) {
    const stream = cloudinary.api.get_streaming_profile(publicId);
    return stream;
  }

  async deleteFile(publicId: string) {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  }
}
