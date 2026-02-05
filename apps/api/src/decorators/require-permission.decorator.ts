import { SetMetadata } from '@nestjs/common';

export const RequirePermission = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);
