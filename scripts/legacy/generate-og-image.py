"""Generate og-image.png (1200x630) for seoscore.tools"""
from PIL import Image, ImageDraw, ImageFont
import math

W, H = 1200, 630

# Create gradient background (135 degrees, #4F46E5 → #7C3AED)
img = Image.new('RGB', (W, H))
pixels = img.load()

c1 = (79, 70, 229)   # #4F46E5
c2 = (124, 58, 237)  # #7C3AED

# 135° gradient
angle_rad = math.radians(135)
dx = math.cos(angle_rad)
dy = math.sin(angle_rad)

# Project corners to find min/max along gradient direction
corners = [(0, 0), (W, 0), (0, H), (W, H)]
projs = [x * dx + y * dy for x, y in corners]
min_p, max_p = min(projs), max(projs)

for y in range(H):
    for x in range(W):
        proj = x * dx + y * dy
        t = (proj - min_p) / (max_p - min_p)
        r = int(c1[0] + (c2[0] - c1[0]) * t)
        g = int(c1[1] + (c2[1] - c1[1]) * t)
        b = int(c1[2] + (c2[2] - c1[2]) * t)
        pixels[x, y] = (r, g, b)

draw = ImageDraw.Draw(img)

# Try to load fonts
try:
    font_logo = ImageFont.truetype("segoeui.ttf", 28)
    font_h1 = ImageFont.truetype("segoeuib.ttf", 60)
    font_sub = ImageFont.truetype("segoeui.ttf", 28)
    font_badge = ImageFont.truetype("segoeuib.ttf", 18)
except:
    try:
        font_logo = ImageFont.truetype("arial.ttf", 28)
        font_h1 = ImageFont.truetype("arialbd.ttf", 60)
        font_sub = ImageFont.truetype("arial.ttf", 28)
        font_badge = ImageFont.truetype("arialbd.ttf", 18)
    except:
        font_logo = ImageFont.load_default()
        font_h1 = font_logo
        font_sub = font_logo
        font_badge = font_logo

white = (255, 255, 255)
white_dim = (255, 255, 255, 217)  # 85% opacity

# Logo: "seoscore.tools"
logo_text = "seoscore.tools"
logo_bbox = draw.textbbox((0, 0), logo_text, font=font_logo)
logo_w = logo_bbox[2] - logo_bbox[0]
draw.text(((W - logo_w) / 2, 140), logo_text, fill=(255, 255, 255, 230), font=font_logo)

# H1: "Free SEO, AEO & GEO Scanner"
h1_text = "Free SEO, AEO & GEO Scanner"
h1_bbox = draw.textbbox((0, 0), h1_text, font=font_h1)
h1_w = h1_bbox[2] - h1_bbox[0]
draw.text(((W - h1_w) / 2, 210), h1_text, fill=white, font=font_h1)

# Subtitle
sub_text = "136 checks in one scan. No signup required."
sub_bbox = draw.textbbox((0, 0), sub_text, font=font_sub)
sub_w = sub_bbox[2] - sub_bbox[0]
draw.text(((W - sub_w) / 2, 310), sub_text, fill=(255, 255, 255, 217), font=font_sub)

# Badges
badges = ["SEO Score", "AEO Score", "GEO Score"]
badge_gap = 16
badge_pad_x = 24
badge_pad_y = 10
badge_radius = 20

# Calculate total badges width
badge_widths = []
for b in badges:
    bb = draw.textbbox((0, 0), b, font=font_badge)
    badge_widths.append(bb[2] - bb[0])

total_badge_w = sum(w + badge_pad_x * 2 for w in badge_widths) + badge_gap * (len(badges) - 1)
badge_y = 390
badge_x_start = (W - total_badge_w) / 2

# Draw badge backgrounds with semi-transparent overlay
overlay = Image.new('RGBA', (W, H), (0, 0, 0, 0))
overlay_draw = ImageDraw.Draw(overlay)

x_pos = badge_x_start
for i, b in enumerate(badges):
    bw = badge_widths[i] + badge_pad_x * 2
    bh = font_badge.size + badge_pad_y * 2 + 10
    overlay_draw.rounded_rectangle(
        [(x_pos, badge_y), (x_pos + bw, badge_y + bh)],
        radius=badge_radius,
        fill=(255, 255, 255, 38)  # 15% opacity white
    )
    # Text centered in badge
    text_x = x_pos + badge_pad_x
    text_y = badge_y + badge_pad_y + 2
    overlay_draw.text((text_x, text_y), b, fill=(255, 255, 255, 230), font=font_badge)
    x_pos += bw + badge_gap

# Composite
img = Image.alpha_composite(img.convert('RGBA'), overlay)

# Save as PNG
output_path = r"C:\Users\Ati\Desktop\seoscore-tools\src\site\og-image.png"
img.save(output_path, 'PNG', optimize=True)
print(f"Generated: {output_path}")

# Also check file size
import os
size = os.path.getsize(output_path)
print(f"File size: {size:,} bytes ({size/1024:.1f} KB)")
