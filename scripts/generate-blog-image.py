#!/usr/bin/env python3
"""
Blog Image Generator using Google Gemini 3 Pro Image API
Usage: python generate-blog-image.py "prompt" "output_filename"
"""

import os
import sys
from datetime import datetime

# 绕过本地代理
os.environ['NO_PROXY'] = '*'

import google.genai as genai
from google.genai import types

API_KEY = os.environ.get("GOOGLE_API_KEY", "")
MODEL_ID = "gemini-3-pro-image-preview"

def generate_image(prompt: str, output_filename: str = None):
    """使用 Gemini 3 Pro Image 生成图片"""
    client = genai.Client(api_key=API_KEY)

    # 增强 prompt 以生成适合博客的图片
    enhanced_prompt = f"""Create a professional, modern blog header image for an AI fashion technology website.
Style: Clean, minimalist, tech-inspired design with fashion elements.
Theme: {prompt}
Requirements:
- No text or watermarks
- High quality, professional look
- Suitable for web use
- Modern gradient backgrounds or soft colors
- Include subtle AI/tech visual elements mixed with fashion imagery"""

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=enhanced_prompt)]
        )
    ]

    config = types.GenerateContentConfig(
        response_modalities=["IMAGE"],
        temperature=1.0
    )

    print(f"Generating image for: {prompt[:50]}...")

    try:
        image_data = None
        for chunk in client.models.generate_content_stream(
            model=MODEL_ID,
            contents=contents,
            config=config
        ):
            if chunk.candidates:
                for part in chunk.candidates[0].content.parts:
                    if hasattr(part, 'inline_data') and part.inline_data:
                        image_data = part.inline_data.data

        if not image_data:
            print("Error: No image generated")
            return None

        # 确定输出路径
        output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "images", "blog")
        os.makedirs(output_dir, exist_ok=True)

        if output_filename:
            output_path = os.path.join(output_dir, f"{output_filename}.png")
        else:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = os.path.join(output_dir, f"blog_{timestamp}.png")

        with open(output_path, 'wb') as f:
            f.write(image_data)

        print(f"Image saved to: {output_path}")
        return output_path

    except Exception as e:
        print(f"Error generating image: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python generate-blog-image.py 'prompt' [output_filename]")
        sys.exit(1)

    prompt = sys.argv[1]
    output_filename = sys.argv[2] if len(sys.argv) > 2 else None

    generate_image(prompt, output_filename)
