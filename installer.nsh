; 视频转码工具安装程序自定义脚本

; 安装程序界面自定义
!define MUI_WELCOMEPAGE_TITLE "欢迎安装视频转码工具"
!define MUI_WELCOMEPAGE_TEXT "这将在您的计算机上安装视频转码工具。$\r$\n$\r$\n本工具基于FFmpeg，支持多种视频格式转换和硬件加速。$\r$\n$\r$\n点击"下一步"继续安装。"

!define MUI_LICENSEPAGE_TEXT_TOP "请仔细阅读以下许可协议："
!define MUI_LICENSEPAGE_TEXT_BOTTOM "如果您接受协议中的条款，请点击"我同意"继续安装。"

!define MUI_COMPONENTSPAGE_TITLE "选择组件"
!define MUI_COMPONENTSPAGE_SUBTITLE "选择您要安装的组件。"

!define MUI_DIRECTORYPAGE_TITLE "选择安装位置"
!define MUI_DIRECTORYPAGE_SUBTITLE "选择视频转码工具的安装文件夹。"
!define MUI_DIRECTORYPAGE_TEXT_TOP "安装程序将把视频转码工具安装到以下文件夹。要安装到不同文件夹，请点击"浏览"并选择其他文件夹。点击"下一步"继续。"

!define MUI_INSTFILESPAGE_TITLE "正在安装"
!define MUI_INSTFILESPAGE_SUBTITLE "请等待视频转码工具安装完成。"

!define MUI_FINISHPAGE_TITLE "安装完成"
!define MUI_FINISHPAGE_TEXT "视频转码工具已成功安装到您的计算机。$\r$\n$\r$\n点击"完成"退出安装程序。"
!define MUI_FINISHPAGE_RUN "$INSTDIR\${PRODUCT_FILENAME}"
!define MUI_FINISHPAGE_RUN_TEXT "立即运行视频转码工具"

; 卸载程序界面自定义
!define MUI_UNINSTALLER_TITLE "卸载视频转码工具"
!define MUI_UNWELCOMEPAGE_TEXT "这将从您的计算机中卸载视频转码工具。$\r$\n$\r$\n点击"下一步"继续卸载。"
!define MUI_UNCONFIRMPAGE_TEXT_TOP "视频转码工具将从以下文件夹中卸载："

; 安装程序版本信息
VIProductVersion "1.0.0.0"
VIAddVersionKey "ProductName" "视频转码工具"
VIAddVersionKey "FileDescription" "基于FFmpeg的视频转码工具"
VIAddVersionKey "FileVersion" "1.0.0.0"
VIAddVersionKey "ProductVersion" "1.0.0"
VIAddVersionKey "CompanyName" "Video Transcoder Team"
VIAddVersionKey "LegalCopyright" "© 2025 Video Transcoder Team"

; 安装程序属性
Name "视频转码工具 v1.0.0"
Caption "视频转码工具安装程序"
BrandingText "基于FFmpeg的专业视频转码工具"

; 自定义安装函数
Function .onInit
  ; 检查是否已安装
  ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "UninstallString"
  StrCmp $R0 "" done
  
  MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION \
  "视频转码工具已经安装。$\n$\n点击"确定"卸载之前的版本，或点击"取消"退出安装。" \
  IDOK uninst
  Abort
  
  uninst:
    ClearErrors
    ExecWait '$R0 _?=$INSTDIR'
    
    IfErrors no_remove_uninstaller done
      Delete $R0
      RMDir $INSTDIR
    no_remove_uninstaller:
  
  done:
FunctionEnd

; 自定义页面
!macro customInstallPage
  ; 可以在这里添加自定义安装页面
!macroend

; 安装后操作
!macro customInstall
  ; 创建注册表项
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "DisplayName" "视频转码工具"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "DisplayVersion" "1.0.0"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "Publisher" "Video Transcoder Team"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "NoModify" 1
  WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具" "NoRepair" 1
  
  ; 关联文件类型（可选）
  WriteRegStr HKCR ".mp4\OpenWithList\${PRODUCT_FILENAME}" "" ""
  WriteRegStr HKCR ".avi\OpenWithList\${PRODUCT_FILENAME}" "" ""
  WriteRegStr HKCR ".mkv\OpenWithList\${PRODUCT_FILENAME}" "" ""
!macroend

; 卸载时清理
!macro customUnInstall
  ; 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\视频转码工具"
  
  ; 清理文件关联
  DeleteRegKey HKCR ".mp4\OpenWithList\${PRODUCT_FILENAME}"
  DeleteRegKey HKCR ".avi\OpenWithList\${PRODUCT_FILENAME}"
  DeleteRegKey HKCR ".mkv\OpenWithList\${PRODUCT_FILENAME}"
  
  ; 清理用户数据（询问用户）
  MessageBox MB_YESNO "是否删除用户配置和日志文件？" IDNO skip_userdata
    RMDir /r "$APPDATA\video-transcoder-gui"
  skip_userdata:
!macroend 