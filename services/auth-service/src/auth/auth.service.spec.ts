import { JwtService } from '@nestjs/jwt';
import type { AuthPrismaService } from '../database/prisma/auth-prisma.service';
import { AuthService } from './auth.service';

describe('Login workload limit', () => {
  it('rejects excess in-flight work and releases slots after failed logins', async () => {
    const waiting: Array<(user: null) => void> = [];
    const findFirst = jest.fn(
      () => new Promise<null>((resolve) => waiting.push(resolve)),
    );
    const prisma = {
      client: { user: { findFirst } },
    } as unknown as AuthPrismaService;
    const service = new AuthService(prisma, new JwtService());
    await service.onModuleInit();
    const input = { identifier: 'unknown', password: 'wrong-test-password' };
    const first = service.login(input);
    const second = service.login(input);
    // Attach rejection handlers before releasing blocked requests.
    const completed = Promise.allSettled([first, second]);
    await expect(service.login(input)).rejects.toMatchObject({ status: 429 });
    expect(findFirst).toHaveBeenCalledTimes(2);
    expect(findFirst).toHaveBeenCalledWith({
      where: { OR: [{ username: 'unknown' }, { email: 'unknown' }] },
      select: { id: true, status: true, passwordHash: true },
    });
    waiting.forEach((resolve) => resolve(null));
    const results = await completed;
    for (const result of results) {
      expect(result).toMatchObject({
        status: 'rejected',
        reason: { status: 401 },
      });
    }
    findFirst.mockResolvedValueOnce(null);
    await expect(service.login(input)).rejects.toMatchObject({ status: 401 });
  }, 20000);
});
