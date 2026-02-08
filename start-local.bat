@echo off
echo ================================
echo 대한피앤에스 로컬 개발 환경 시작
echo ================================
echo.

echo [1/4] Docker 컨테이너 시작 중...
docker-compose up -d
if %errorlevel% neq 0 (
    echo.
    echo ❌ Docker가 설치되어 있지 않거나 실행 중이 아닙니다.
    echo    Docker Desktop을 설치하고 실행해주세요: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo.
echo [2/4] 데이터베이스 준비 중 (5초 대기)...
timeout /t 5 /nobreak > nul

echo.
echo [3/4] 로컬 환경 변수로 전환...
copy /Y apps\api\.env.local apps\api\.env > nul
echo ✅ .env 파일을 로컬 설정으로 변경했습니다.

cd apps\api

echo.
echo [4/4] Prisma 마이그레이션 실행 중...
call npx prisma migrate dev --name init
if %errorlevel% neq 0 (
    echo.
    echo ❌ 마이그레이션 실패! 다시 시도해주세요.
    pause
    exit /b 1
)

echo.
echo ================================
echo ✅ 로컬 개발 환경 준비 완료!
echo ================================
echo.
echo 📊 Docker 컨테이너:
echo   - PostgreSQL: localhost:5432
echo   - Redis: localhost:6379
echo.
echo 🚀 개발 서버 시작:
echo   npm run start:dev
echo.
echo 🛑 컨테이너 중지:
echo   docker-compose down
echo.
pause

call npm run start:dev
