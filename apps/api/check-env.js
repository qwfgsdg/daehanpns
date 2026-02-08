// Railway 배포 디버깅용 - 환경변수 확인
console.log('=== Environment Variables Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL starts with postgres:', process.env.DATABASE_URL?.startsWith('postgres'));
console.log('DATABASE_URL length:', process.env.DATABASE_URL?.length);
console.log('DATABASE_URL first 20 chars:', process.env.DATABASE_URL?.substring(0, 20));
console.log('REDIS_HOST:', process.env.REDIS_HOST);
console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
console.log('All env keys:', Object.keys(process.env).filter(k => !k.includes('PATH') && !k.includes('HOME')).sort());
console.log('===================================');
