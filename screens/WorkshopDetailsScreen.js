#Requires AutoHotkey v2.0

global targetHwnd:= 0
global moveMode:= false
global myGui:= 0

  ; ///---/// ADDED: repeat-state globals
global repeatTimer:= 0
global repeatKeys:= ""
  ; ///---/// END ADDED

myGui:= Gui("+AlwaysOnTop -Caption +ToolWindow")
myGui.BackColor := "F5F1E8"
myGui.SetFont("s12 Bold", "Segoe UI")

BTN_W:= 92
BTN_H:= 58
GAP_X:= 8
GAP_Y:= 8

  ; Row 1
btnTarget:= myGui.Add("Button", "x" GAP_X " y" GAP_Y " w" BTN_W " h" BTN_H, "TARGET")
btnMove:= myGui.Add("Button", "x"(GAP_X * 2 + BTN_W) " y" GAP_Y " w" BTN_W " h" BTN_H, "MOVE")

  ; Row 2
btnDel:= myGui.Add("Button", "x" GAP_X " y"(GAP_Y * 2 + BTN_H) " w" BTN_W " h" BTN_H, "DEL")
btnLine:= myGui.Add("Button", "x"(GAP_X * 2 + BTN_W) " y"(GAP_Y * 2 + BTN_H) " w" BTN_W " h" BTN_H, "LINE")

  ; Row 3
btnWord:= myGui.Add("Button", "x" GAP_X " y"(GAP_Y * 3 + BTN_H * 2) " w" BTN_W " h" BTN_H, "WORD")
btnUp:= myGui.Add("Button", "x"(GAP_X * 2 + BTN_W) " y"(GAP_Y * 3 + BTN_H * 2) " w" BTN_W " h" BTN_H, "UP")

  ; Row 4
btnDown:= myGui.Add("Button"
  , "x" GAP_X " y"(GAP_Y * 4 + BTN_H * 3) " w"(BTN_W * 2 + GAP_X) " h" BTN_H
  , "DOWN"
)

guiW:= (GAP_X * 3 + BTN_W * 2)
guiH:= (GAP_Y * 5 + BTN_H * 4)
myGui.Show("x200 y200 w" guiW " h" guiH)

  ; -------------------------
; Target + send helpers
  ; -------------------------
    SetTargetFromTap() {
  global targetHwnd, myGui
  ToolTip("Tap VS Code now (2 sec)...", 20, 20)
  Sleep 2000
  ToolTip()

  hwnd:= WinGetID("A")
  if (hwnd = myGui.Hwnd) {
    SoundBeep(500, 120)
    return
  }
  targetHwnd:= hwnd
  SoundBeep(900, 120)
}

SendToTarget(keys) {
  global targetHwnd
  if (!targetHwnd) {
    SoundBeep(400, 150)
    return
  }
  try {
    WinActivate("ahk_id " targetHwnd)
    WinWaitActive("ahk_id " targetHwnd, , 0.6)
    Sleep 20
    Send(keys)
  } catch {
    SoundBeep(300, 200)
  }
}

ToggleMoveMode() {
  global moveMode, btnMove
  moveMode:= !moveMode
  btnMove.Text := moveMode ? "MOVE✓" : "MOVE"
  SoundBeep(moveMode ? 700 : 500, 90)
}

; ///---/// ADDED: repeat helpers (hold to keep selecting)
StartRepeat(keys) {
  global repeatTimer, repeatKeys, moveMode

  if (moveMode)
    return

      ; Start repeating only after a short delay so taps still feel like taps
  repeatKeys:= keys

    ; First action happens immediately for responsiveness
  SendToTarget(repeatKeys)

    ; Then repeat quickly
  SetTimer(DoRepeat, 120); repeat interval(ms).Adjust to taste.
}

DoRepeat() {
  global repeatKeys
  if (repeatKeys != "")
    SendToTarget(repeatKeys)
}

StopRepeat(*) {
  global repeatKeys
  repeatKeys:= ""
  SetTimer(DoRepeat, 0)
}
; ///---/// END ADDED

; -------------------------
; Button events
  ; -------------------------
    btnTarget.OnEvent("Click", (*) => SetTargetFromTap())
btnMove.OnEvent("Click", (*) => ToggleMoveMode())

btnDel.OnEvent("Click", (*) =>(moveMode ? 0 : SendToTarget("{Delete}")))
btnLine.OnEvent("Click", (*) =>(moveMode ? 0 : SendToTarget("^l")))
btnWord.OnEvent("Click", (*) =>(moveMode ? 0 : SendToTarget("^+{Right}")))

  ; Single tap still works:
; Hold works via Down / Up events.
  btnUp.OnEvent("Click", (*) =>(moveMode ? 0 : SendToTarget("+{Up}")))
btnDown.OnEvent("Click", (*) =>(moveMode ? 0 : SendToTarget("+{Down}")))

  ; ///---/// ADDED: hold-to-repeat (works best with mouse; touch depends on device/driver)
btnUp.OnEvent("Down", (*) => StartRepeat("+{Up}"))
btnUp.OnEvent("Up", StopRepeat)

btnDown.OnEvent("Down", (*) => StartRepeat("+{Down}"))
btnDown.OnEvent("Up", StopRepeat)
  ; ///---/// END ADDED

; -------------------------
; MOVE mode drag(touch / mouse)
  ; -------------------------
    OnMessage(0x201, WM_LBUTTONDOWN); WM_LBUTTONDOWN

WM_LBUTTONDOWN(wParam, lParam, msg, hwnd) {
  global myGui, moveMode

  if (!moveMode)
    return

  guiHwnd:= myGui.Hwnd
  parentHwnd:= DllCall("user32\GetParent", "ptr", hwnd, "ptr")

  if (hwnd != guiHwnd && parentHwnd != guiHwnd)
    return

  DllCall("user32\ReleaseCapture")
  SendMessage(0xA1, 2, 0, , "ahk_id " guiHwnd)
}