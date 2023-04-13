import { Module } from '@nestjs/common';
import { FileController } from './file.controller';
import { FileService } from './file.service';
import { CloudinaryProvider } from './cloudinary.provider';

@Module({
  imports: [],
  controllers: [FileController],
  providers: [FileService, CloudinaryProvider],
})
export class FileModule {}
