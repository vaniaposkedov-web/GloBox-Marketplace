@echo off
title GloBox - Pack Archive
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0pack.ps1"
