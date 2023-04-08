import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  Get,
  Param,
  Res,
  Delete,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    return await this.fileService.uploadFile(file);
  }

  @Get('read/:publicId')
  async readFile(@Param('publicId') publicId: string, @Res() res: Response) {
    const stream = await this.fileService.readFile(publicId);
    stream.pipe(res);
  }

  @Delete('delete/:publicId')
  async deleteFile(@Param('publicId') publicId: string) {
    return await this.fileService.deleteFile(publicId);
  }
}
