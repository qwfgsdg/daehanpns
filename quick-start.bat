@echo off
echo ================================
echo 대한피앤에스 백엔드 Quick Start
echo ================================
echo.

cd apps\api

echo [1/3] Prisma 클라이언트 생성 중...
call npm run prisma:generate
if %errorlevel% neq 0 (
    echo ❌ Prisma 생성 실패! .env 파일을 확인하세요.
    pause
    exit /b 1
)

echo.
echo [2/3] 데이터베이스 마이그레이션 중...
call npm run prisma:migrate
if %errorlevel% neq 0 (
    echo ❌ 마이그레이션 실패! DATABASE_URL을 확인하세요.
    pause
    exit /b 1
)

echo.
echo [3/3] 개발 서버 시작 중...
echo 서버 주소: http://localhost:3000
echo 중지: Ctrl+C
echo.
call npm run start:dev
