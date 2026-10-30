@echo off
title PAPAGEDON AEI
cd /d "C:\Users\DADDY MUPHASA\Documents\GitHub\PAPAGEDON-AEI"

if not exist "node_modules\" (
  echo First run: installing dependencies, this takes a minute...
  call npm install
  echo.
)

echo.
echo  PAPAGEDON AEI
echo  [1] Live edit mode  (see changes instantly)
echo  [2] Show mode       (fast, smooth - for demos)
echo.
choice /c 12 /n /m "Pick 1 or 2: "

if errorlevel 2 goto show

:dev
echo Starting live edit mode...
echo Opening show control + output in your browser in a few seconds.
echo If this window reports a different port, use that port in the address.
start "opening browser" cmd /c "timeout /t 12 /nobreak >nul & start http://localhost:3000/meta/show/control & start http://localhost:3000/meta/show/output"
call npm run dev
goto end

:show
echo Building... (takes a minute)
call npm run build || (echo BUILD FAILED & pause & exit /b)
echo Starting show mode...
echo Opening show control + output in your browser in a few seconds.
echo If this window reports a different port, use that port in the address.
start "opening browser" cmd /c "timeout /t 12 /nobreak >nul & start http://localhost:3000/meta/show/control & start http://localhost:3000/meta/show/output"
call npm start

:end
pause
