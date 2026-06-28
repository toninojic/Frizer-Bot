import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ExecuteToolDto } from './dto/execute-tool.dto';
import { InternalToolsKeyGuard } from './internal-tools-key.guard';
import { ToolLayerService } from './tool-layer.service';

@UseGuards(InternalToolsKeyGuard)
@Controller('tools')
export class ToolLayerController {
  constructor(private readonly toolLayerService: ToolLayerService) {}

  @Post('execute')
  execute(@Body() dto: ExecuteToolDto) {
    return this.toolLayerService.execute(dto);
  }
}
