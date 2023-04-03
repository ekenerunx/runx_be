import { Controller, Delete, Post } from '@nestjs/common';

@Controller('files')
export class FileController {
  @Post()
  async uploadFile() {
    return { message: 'File successfully upload' };
  }
  @Delete()
  async deleteFile() {
    return { message: 'File succesfully deleted' };
  }
}
