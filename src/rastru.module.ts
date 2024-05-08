import { Module } from "@nestjs/common";
import { ConfigurableModuleClass } from "./rastru.module-definition";
import { RastruService } from "./rastru.service";

@Module({
  providers: [RastruService],
  exports: [RastruService],
})
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export class RastruModule extends ConfigurableModuleClass {}
