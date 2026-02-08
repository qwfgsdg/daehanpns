import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.update({
    where: { loginId: 'admin' },
    data: {
      password: hashedPassword,
      loginAttempts: 0, // 로그인 시도 횟수 초기화
      lockedUntil: null, // 잠금 해제
    },
  });

  console.log('✅ 관리자 비밀번호가 재설정되었습니다!');
  console.log('LoginId: admin');
  console.log('Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ 에러:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
