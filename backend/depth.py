"""
Depth map generation using Apple's Depth Pro or MiDaS as fallback.

This module provides depth map generation. It will attempt to use Depth Pro
if available, otherwise falls back to MiDaS.
"""

import io
import numpy as np
from PIL import Image


def generate_depth_map(image_data: bytes, output_path: str) -> float:
    """
    Generate a depth map from image data.

    Args:
        image_data: Raw image bytes
        output_path: Path to save the depth map PNG

    Returns:
        focal_length_px: Estimated focal length in pixels
    """
    # Load image
    image = Image.open(io.BytesIO(image_data)).convert("RGB")
    width, height = image.size

    try:
        # Try to use Depth Pro (Apple's model)
        return generate_with_depth_pro(image, output_path)
    except ImportError as e:
        print(f"Depth Pro not installed: {e}")
    except Exception as e:
        print(f"Depth Pro error: {e}")

    try:
        return generate_with_midas(image, output_path)
    except ImportError as e:
        error_msg = "MiDaS dependencies not installed. Please install: pip install transformers torch"
        print(error_msg)
        raise ImportError(error_msg)
    except Exception as e:
        error_msg = f"MiDaS depth generation failed: {str(e)}"
        print(error_msg)
        raise Exception(error_msg)


def generate_with_depth_pro(image: Image.Image, output_path: str) -> float:
    """Generate depth map using Apple's Depth Pro model."""
    try:
        import depth_pro
        import torch

        # Load model (cached after first load)
        model, transform = depth_pro.create_model_and_transforms()
        model.eval()

        # Move to GPU if available
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)

        # Transform and predict
        image_tensor = transform(image).unsqueeze(0).to(device)

        with torch.no_grad():
            prediction = model.infer(image_tensor)
            depth = prediction["depth"].cpu().numpy().squeeze()
            focal_length = prediction.get("focal_length_px", image.width / 2)

        # Normalize depth to 0-1 range
        depth_normalized = (depth - depth.min()) / (depth.max() - depth.min())

        # Invert so closer = brighter
        depth_inverted = 1.0 - depth_normalized

        # Convert to 8-bit image
        depth_uint8 = (depth_inverted * 255).astype(np.uint8)
        depth_image = Image.fromarray(depth_uint8, mode='L')
        depth_image.save(output_path)

        return float(focal_length)

    except ImportError:
        raise ImportError("depth_pro not installed")


def generate_with_midas(image: Image.Image, output_path: str) -> float:
    """Generate depth map using DPT model from Hugging Face."""
    try:
        import torch
        from transformers import DPTImageProcessor, DPTForDepthEstimation
        import os
        from pathlib import Path

        # Cache models in backend/models directory
        cache_dir = Path(__file__).parent / "models"
        cache_dir.mkdir(exist_ok=True)

        print(f"Loading MiDaS model from cache: {cache_dir}")

        # Load DPT model (will cache locally after first download)
        processor = DPTImageProcessor.from_pretrained(
            "Intel/dpt-hybrid-midas",
            cache_dir=str(cache_dir)
        )
        model = DPTForDepthEstimation.from_pretrained(
            "Intel/dpt-hybrid-midas",
            cache_dir=str(cache_dir)
        )
        model.eval()

        # Move to GPU if available
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {device}")
        model.to(device)

        # Process image
        inputs = processor(images=image, return_tensors="pt").to(device)

        with torch.no_grad():
            outputs = model(**inputs)
            predicted_depth = outputs.predicted_depth

        # Interpolate to original size
        prediction = torch.nn.functional.interpolate(
            predicted_depth.unsqueeze(1),
            size=image.size[::-1],  # (height, width)
            mode="bicubic",
            align_corners=False,
        )

        depth = prediction.squeeze().cpu().numpy()

        # Normalize depth to 0-1 range
        depth_normalized = (depth - depth.min()) / (depth.max() - depth.min())

        # Invert so closer = brighter
        depth_inverted = 1.0 - depth_normalized

        # Convert to 8-bit image
        depth_uint8 = (depth_inverted * 255).astype(np.uint8)
        depth_image = Image.fromarray(depth_uint8, mode='L')
        depth_image.save(output_path)

        # Estimate focal length (rough approximation)
        focal_length = image.width / 2

        return float(focal_length)

    except Exception as e:
        raise Exception(f"DPT depth generation failed: {str(e)}")


def generate_with_luminance(image: Image.Image, output_path: str) -> float:
    """
    Generate a pseudo-depth map using luminance (fallback when AI models unavailable).
    
    This creates a simple depth approximation based on brightness - darker areas
    appear closer, brighter areas appear farther. Not as good as AI-based depth,
    but provides some parallax effect.
    """
    # Convert to grayscale (luminance)
    grayscale = image.convert('L')
    depth = np.array(grayscale, dtype=np.float32)
    
    # Apply gaussian blur to smooth the depth
    from PIL import ImageFilter
    blurred = grayscale.filter(ImageFilter.GaussianBlur(radius=10))
    depth = np.array(blurred, dtype=np.float32)
    
    # Normalize to 0-1
    depth_normalized = (depth - depth.min()) / (depth.max() - depth.min() + 1e-8)
    
    # Convert to 8-bit
    depth_uint8 = (depth_normalized * 255).astype(np.uint8)
    depth_image = Image.fromarray(depth_uint8, mode='L')
    depth_image.save(output_path)
    
    return float(image.width / 2)
