@echo off
REM PAPAGEDON-AEI local checks: typecheck + full test suite.
REM Double-click this file to run it. No browser or localhost needed.
cd /d "%~dp0"
echo === 1/2 typecheck ===
call npm run typecheck
echo.
echo === 2/2 tests ===
call npm test
echo.
echo Done. Press any key to close this window.
pause >nul
