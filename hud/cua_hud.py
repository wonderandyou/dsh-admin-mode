"""DSH control HUD: full-screen glow frame + frosted-glass caption box.

Both windows are transparent, click-through and always on top.
- "show" from the agent bridge makes them appear and restarts a 1.6 s keep-alive
- while the agent keeps operating, repeated "show" keeps them steady (no flicker)
- 1.6 s after the last operation they fade out
- ESC quits
"""
import ctypes
import os
import sys
import tempfile
import math
import time
from ctypes import wintypes

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageGrab

user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
dwmapi = ctypes.windll.dwmapi
user32.SetProcessDPIAware()
SW, SH = user32.GetSystemMetrics(0), user32.GetSystemMetrics(1)

WS_EX_LAYERED = 0x00080000
WS_EX_TRANSPARENT = 0x00000020
WS_EX_TOPMOST = 0x00000008
WS_EX_TOOLWINDOW = 0x00000080
WS_POPUP = 0x80000000
ULW_ALPHA = 0x00000002
HWND_TOPMOST = ctypes.c_void_p(-1)
SWP_NOMOVE = 0x0002
SWP_NOSIZE = 0x0001
SWP_NOACTIVATE = 0x0010

CMD_FILE = sys.argv[1] if len(sys.argv) > 1 else os.path.join(tempfile.gettempdir(), "dsh_cua_hud_cmd.txt")
KEEPALIVE = 30.0

user32.CreateWindowExW.restype = ctypes.c_void_p
user32.CreateWindowExW.argtypes = [
    wintypes.DWORD, wintypes.LPCWSTR, wintypes.LPCWSTR, wintypes.DWORD,
    ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
    ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
]
user32.UpdateLayeredWindow.argtypes = [
    ctypes.c_void_p, ctypes.c_void_p, ctypes.POINTER(wintypes.POINT),
    ctypes.POINTER(wintypes.SIZE), ctypes.c_void_p, ctypes.POINTER(wintypes.POINT),
    wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD,
]
user32.SetWindowPos.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int,
                                ctypes.c_int, ctypes.c_int, ctypes.c_int, wintypes.UINT]
user32.ShowWindow.argtypes = [ctypes.c_void_p, ctypes.c_int]
user32.DestroyWindow.argtypes = [ctypes.c_void_p]
user32.SetWindowRgn.argtypes = [ctypes.c_void_p, ctypes.c_void_p, wintypes.BOOL]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", wintypes.DWORD), ("biWidth", wintypes.LONG),
        ("biHeight", wintypes.LONG), ("biPlanes", wintypes.WORD),
        ("biBitCount", wintypes.WORD), ("biCompression", wintypes.DWORD),
        ("biSizeImage", wintypes.DWORD), ("biXPelsPerMeter", wintypes.LONG),
        ("biYPelsPerMeter", wintypes.LONG), ("biClrUsed", wintypes.DWORD),
        ("biClrImportant", wintypes.DWORD),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", wintypes.DWORD * 3)]


class BLENDFUNCTION(ctypes.Structure):
    _fields_ = [("BlendOp", ctypes.c_byte), ("BlendFlags", ctypes.c_byte),
                ("SourceConstantAlpha", ctypes.c_byte), ("AlphaFormat", ctypes.c_byte)]


class LayerWindow:
    def __init__(self, name, x, y, w, h, rounded=0):
        self.w, self.h = w, h
        self.x, self.y = x, y
        self.hwnd = user32.CreateWindowExW(
            WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST | WS_EX_TOOLWINDOW,
            "static", name, WS_POPUP, x, y, w, h, None, None, None, None)
        if rounded > 0:
            rgn = gdi32.CreateRoundRectRgn(0, 0, w + 1, h + 1, rounded * 2, rounded * 2)
            user32.SetWindowRgn(ctypes.c_void_p(self.hwnd), rgn, True)
        dwmapi.DwmSetWindowAttribute.argtypes = [
            ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p, wintypes.DWORD]
        color = ctypes.c_uint(0xFFFFFFFE)
        dwmapi.DwmSetWindowAttribute(ctypes.c_void_p(self.hwnd), 34,
                                     ctypes.byref(color), 4)
        policy = ctypes.c_int(1)
        dwmapi.DwmSetWindowAttribute(ctypes.c_void_p(self.hwnd), 2,
                                     ctypes.byref(policy), 4)
        self.screen_dc = user32.GetDC(None)
        self.mem_dc = gdi32.CreateCompatibleDC(self.screen_dc)
        bmi = BITMAPINFO()
        bmi.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
        bmi.bmiHeader.biWidth = w
        bmi.bmiHeader.biHeight = -h
        bmi.bmiHeader.biPlanes = 1
        bmi.bmiHeader.biBitCount = 32
        self.bits = ctypes.c_void_p()
        self.bitmap = gdi32.CreateDIBSection(self.screen_dc, ctypes.byref(bmi), 0,
                                             ctypes.byref(self.bits), None, 0)
        gdi32.SelectObject(self.mem_dc, self.bitmap)
        self.dst = wintypes.POINT(x, y)
        self.size = wintypes.SIZE(w, h)
        self.zero = wintypes.POINT(0, 0)
        self.blend = BLENDFUNCTION(0, 0, 255, 1)
        self.visible = False

    def push(self, image):
        ctypes.memmove(self.bits, image.tobytes("raw", "BGRA"), self.w * self.h * 4)
        user32.UpdateLayeredWindow(ctypes.c_void_p(self.hwnd), self.screen_dc,
                                   ctypes.byref(self.dst), ctypes.byref(self.size),
                                   self.mem_dc, ctypes.byref(self.zero), 0,
                                   ctypes.byref(self.blend), ULW_ALPHA)

    def show(self):
        user32.ShowWindow(ctypes.c_void_p(self.hwnd), 8)
        user32.SetWindowPos(ctypes.c_void_p(self.hwnd), HWND_TOPMOST, self.x, self.y,
                            0, 0, SWP_NOSIZE | SWP_NOACTIVATE)
        self.visible = True

    def hide(self):
        user32.ShowWindow(ctypes.c_void_p(self.hwnd), 0)
        self.visible = False

    def destroy(self):
        user32.DestroyWindow(ctypes.c_void_p(self.hwnd))
        gdi32.DeleteObject(self.bitmap)
        gdi32.DeleteDC(self.mem_dc)
        user32.ReleaseDC(None, self.screen_dc)


def build_frame():
    base = Image.new("RGBA", (SW, SH), (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    border = 46
    top = (150, 200, 255)
    deep = (85, 150, 240)
    for i in range(border):
        t = i / border
        alpha = int(150 * (math.cos(t * math.pi * 0.5) ** 3))
        color = tuple(int(top[c] * (1 - t) + deep[c] * t) for c in range(3)) + (alpha,)
        draw.rectangle([i, i, SW - 1 - i, SH - 1 - i], outline=color)
    glow = base.filter(ImageFilter.GaussianBlur(75))
    glow = glow.point(lambda v: min(255, int(v * 1.1)))
    return Image.alpha_composite(glow, base)


BOX_W, BOX_H, RADIUS = 452, 96, 22
BOX_X, BOX_Y = (SW - BOX_W) // 2, 16


def build_box():
    bg = ImageGrab.grab(bbox=(BOX_X, BOX_Y, BOX_X + BOX_W, BOX_Y + BOX_H),
                        all_screens=True).convert("RGBA")
    bg = bg.filter(ImageFilter.GaussianBlur(30))
    tint = Image.new("RGBA", (BOX_W, BOX_H), (34, 96, 190, 58))
    img = Image.alpha_composite(bg, tint)
    shade = Image.new("RGBA", (BOX_W, BOX_H), (8, 22, 48, 34))
    img = Image.alpha_composite(img, shade)

    grain = Image.effect_noise((BOX_W, BOX_H), 22).convert("L")
    grain_img = Image.new("RGBA", (BOX_W, BOX_H), (255, 255, 255, 0))
    grain_img.putalpha(grain.point(lambda v: int(v * 0.055)))
    img = Image.alpha_composite(img, grain_img)

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle([1, 1, BOX_W - 2, BOX_H - 2], radius=RADIUS - 1,
                           outline=(255, 255, 255, 46), width=1)
    draw.rounded_rectangle([2, 2, BOX_W - 3, BOX_H - 3], radius=RADIUS - 2,
                           outline=(160, 210, 255, 60), width=1)
    sheen = Image.new("RGBA", (BOX_W, BOX_H), (0, 0, 0, 0))
    ImageDraw.Draw(sheen).rounded_rectangle(
        [2, 2, BOX_W - 3, BOX_H // 2], radius=RADIUS - 2, fill=(255, 255, 255, 26))
    img = Image.alpha_composite(img, sheen)

    draw = ImageDraw.Draw(img)
    font = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 23)
    small = ImageFont.truetype("C:/Windows/Fonts/msyh.ttc", 15)
    title = "DSH 正在控制你的电脑"
    hint = "按 ESC 取消"
    tb = draw.textbbox((0, 0), title, font=font)
    draw.text(((BOX_W - (tb[2] - tb[0])) // 2, 22), title, font=font,
              fill=(245, 250, 255, 255))
    hb = draw.textbbox((0, 0), hint, font=small)
    draw.text(((BOX_W - (hb[2] - hb[0])) // 2, 58), hint, font=small,
              fill=(200, 224, 255, 215))

    mask = Image.new("L", (BOX_W, BOX_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, BOX_W - 1, BOX_H - 1],
                                           radius=RADIUS, fill=255)
    img.putalpha(mask)
    return img


frame = build_frame()
frame_win = LayerWindow("DSH Frame", 0, 0, SW, SH)
frame_win.push(frame)
box_win = LayerWindow("DSH Box", BOX_X, BOX_Y, BOX_W, BOX_H, rounded=RADIUS)
box_win.push(build_box())

print("HUD_READY", SW, SH, flush=True)

state = {"visible": False, "last": 0.0, "running": True}


def show_all():
    frame_win.show()
    box_win.push(build_box())
    box_win.show()
    state["visible"] = True
    state["last"] = time.time()
    print("VISIBLE", flush=True)


def hide_all():
    frame_win.hide()
    box_win.hide()
    state["visible"] = False
    state["last"] = 0.0
    print("HIDDEN", flush=True)


try:
    with open(CMD_FILE, "w", encoding="utf-8") as fh:
        fh.write("hide")
except OSError:
    pass

VK_ESCAPE = 0x1B
last_cmd = "hide"
while state["running"]:
    try:
        with open(CMD_FILE, "r", encoding="utf-8") as fh:
            cmd = fh.read().strip().lower()
    except OSError:
        cmd = last_cmd
    if cmd == "show":
        if state["visible"]:
            state["last"] = time.time()
        else:
            show_all()
    elif cmd == "quit":
        print("QUIT_CMD", flush=True)
        break
    # "hide" from older agent builds is ignored on purpose: the HUD stays up
    # for KEEPALIVE seconds after the last "show" instead of blinking

    if state["visible"] and state["last"] and time.time() - state["last"] > KEEPALIVE:
        hide_all()

    if user32.GetAsyncKeyState(VK_ESCAPE) & 0x8000:
        print("ESC_PRESSED", flush=True)
        break
    time.sleep(0.08)

frame_win.destroy()
box_win.destroy()
print("HUD_DOWN", flush=True)

