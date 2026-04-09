import type { Operation } from '../types/operations';

export const operations: Operation[] = [
  {
    id: 'resize',
    name: 'Resize',
    category: 'Transform',
    description: 'Change image dimensions',
    args: [
      { name: 'scale', label: 'Scale (%)', type: 'number', default: 100, min: 1, max: 500 },
      { name: 'interpolate', label: 'Interpolate', type: 'select', default: 'bilinear', options: ['bilinear', 'bicubic', 'nearest', 'average'] },
      { name: 'filter', label: 'Filter', type: 'select', default: 'lanczos', options: ['lanczos', 'catrom', 'mitchell', 'spline', 'cubic', 'triangle', 'box', 'point'] }
    ]
  },
  {
    id: 'rotate',
    name: 'Rotate',
    category: 'Transform',
    description: 'Rotate image by degrees',
    args: [
      { name: 'degrees', label: 'Degrees', type: 'number', default: 90, min: -360, max: 360 }
    ]
  },
  {
    id: 'sampling',
    name: 'Sampling Factor',
    category: 'Compression',
    description: 'Set chroma subsampling for JPEG compression',
    args: [
      { name: 'factor', label: 'Factor', type: 'select', default: '4:2:0', options: ['1:1:1', '4:1:1', '4:2:0', '4:2:2', '4:4:0', '4:4:4'] }
    ]
  },
  {
    id: 'quality',
    name: 'Quality',
    category: 'Compression',
    description: 'Set compression quality level',
    args: [
      { name: 'value', label: 'Quality', type: 'number', default: 85, min: 1, max: 100 }
    ]
  },
  {
    id: 'format',
    name: 'Format',
    category: 'Output',
    description: 'Set output format',
    args: [
      { name: 'type', label: 'Format', type: 'select', default: 'png', options: ['png', 'jpg', 'webp', 'gif'] }
    ]
  },
  {
    id: 'saturate',
    name: 'Saturate',
    category: 'Color',
    description: 'Adjust color saturation',
    args: [
      { name: 'amount', label: 'Amount', type: 'number', default: 100, min: 0, max: 300 }
    ]
  },
  {
    id: 'dither',
    name: 'Dither',
    category: 'Color',
    description: 'Apply dithering effect',
    args: [
      { name: 'method', label: 'Method', type: 'select', default: 'FloydSteinberg', options: ['None', 'FloydSteinberg', 'Riemersma', 'ordered-2x2', 'ordered-3x3', 'ordered-4x4', 'ordered-8x8'] },
      { name: 'levels', label: 'Levels', type: 'number', default: 4, min: 2, max: 16 }
    ]
  },
  {
    id: 'posterize',
    name: 'Posterize',
    category: 'Color',
    description: 'Reduce color palette',
    args: [
      { name: 'levels', label: 'Levels', type: 'number', default: 4, min: 2, max: 256 }
    ]
  },
  {
    id: 'threshold',
    name: 'Threshold',
    category: 'Color',
    description: 'Apply black/white threshold',
    args: [
      { name: 'value', label: 'Value', type: 'number', default: 50, min: 0, max: 100 }
    ]
  },
  {
    id: 'normalize',
    name: 'Normalize',
    category: 'Color',
    description: 'Normalize image contrast',
    args: []
  },
  {
    id: 'gamma',
    name: 'Gamma',
    category: 'Color',
    description: 'Adjust gamma correction',
    args: [
      { name: 'value', label: 'Value', type: 'number', default: 1.0, min: 0.1, max: 10.0 }
    ]
  },
  {
    id: 'level',
    name: 'Level',
    category: 'Color',
    description: 'Adjust black/white points',
    args: [
      { name: 'black', label: 'Black', type: 'number', default: 0, min: 0, max: 100 },
      { name: 'white', label: 'White', type: 'number', default: 100, min: 0, max: 100 },
      { name: 'gamma', label: 'Gamma', type: 'number', default: 1, min: 0.1, max: 10 }
    ]
  },
  {
    id: 'quantize',
    name: 'Quantize',
    category: 'Color',
    description: 'Reduce color palette',
    args: [
      { name: 'colors', label: 'Colors', type: 'number', default: 8, min: 2, max: 256 },
      { name: 'pattern', label: 'Dither', type: 'select', default: 'none', options: ['none', 'o3x3', 'o4x4', 'o8x8', 'o2x2', 'o8x8,4'] }
    ]
  },
  {
    id: 'grayscale',
    name: 'Grayscale',
    category: 'Color',
    description: 'Convert to grayscale',
    args: [
      { name: 'method', label: 'Method', type: 'select', default: 'Rec601Luma', options: ['Average', 'Brightness', 'Rec601Luma', 'Rec709Luma', 'Lightness', 'Luminance'] }
    ]
  },
  {
    id: 'blur',
    name: 'Blur',
    category: 'Effects',
    description: 'Apply gaussian blur',
    args: [
      { name: 'radius', label: 'Radius', type: 'number', default: 5, min: 0, max: 100 }
    ]
  },
  {
    id: 'sharpen',
    name: 'Sharpen',
    category: 'Effects',
    description: 'Sharpen the image',
    args: [
      { name: 'radius', label: 'Radius', type: 'number', default: 2, min: 0, max: 100 }
    ]
  },
  {
    id: 'spread',
    name: 'Spread',
    category: 'Effects',
    description: 'Randomly displace pixels',
    args: [
      { name: 'amount', label: 'Amount', type: 'number', default: 3, min: 0, max: 50 }
    ]
  },
  {
    id: 'noise',
    name: 'Noise',
    category: 'Effects',
    description: 'Add random noise',
    args: [
      { name: 'type', label: 'Type', type: 'select', default: 'NonPeak', options: ['NonPeak', 'RandomThreshold', 'RandomColor'] },
      { name: 'amount', label: 'Amount', type: 'number', default: 10, min: 1, max: 100 },
      { name: 'high', label: 'High', type: 'number', default: 80, min: 0, max: 100 }
    ]
  },
  {
    id: 'shade',
    name: 'Shade',
    category: 'Effects',
    description: 'Apply 3D shading effect',
    args: [
      { name: 'azimuth', label: 'Azimuth', type: 'number', default: 30, min: 0, max: 360 },
      { name: 'elevation', label: 'Elevation', type: 'number', default: 30, min: 0, max: 90 }
    ]
  },
  {
    id: 'swirl',
    name: 'Swirl',
    category: 'Distort',
    description: 'Swirl pixels around center',
    args: [
      { name: 'degrees', label: 'Degrees', type: 'number', default: 90, min: -360, max: 360 }
    ]
  },
  {
    id: 'wave',
    name: 'Wave',
    category: 'Distort',
    description: 'Apply sinusoidal wave',
    args: [
      { name: 'amplitude', label: 'Amplitude', type: 'number', default: 10, min: 0, max: 100 },
      { name: 'wavelength', label: 'Wavelength', type: 'number', default: 30, min: 1, max: 200 }
    ]
  },
  {
    id: 'solarize',
    name: 'Solarize',
    category: 'Effects',
    description: 'Solarization effect',
    args: [
      { name: 'threshold', label: 'Threshold', type: 'number', default: 50, min: 0, max: 100 }
    ]
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    category: 'Color',
    description: 'Apply monochrome threshold',
    args: []
  },
  {
    id: 'negate',
    name: 'Negate',
    category: 'Color',
    description: 'Invert colors',
    args: []
  },
  {
    id: 'flip',
    name: 'Flip',
    category: 'Transform',
    description: 'Flip image vertically',
    args: []
  },
  {
    id: 'colorspace',
    name: 'Colorspace',
    category: 'Color',
    description: 'Change image colorspace',
    args: [
      { name: 'space', label: 'Colorspace', type: 'select', default: 'sRGB', options: ['sRGB', 'RGB', 'CMYK', 'Gray', 'LAB', 'XYZ', 'YCbCr', 'YUV'] }
    ]
  },
  {
    id: 'channel-shift',
    name: 'Channel Shift',
    category: 'Distort',
    description: 'Shift chrominance channels for glitch effect',
    args: [
      { name: 'colorspace', label: 'Colorspace', type: 'select', default: 'YCbCr', options: ['RGB', 'YCbCr', 'CMYK', 'LAB', 'XYZ', 'YUV'] },
      { name: 'ch1X', label: 'Ch1 X Offset', type: 'number', default: 0, min: -100, max: 100 },
      { name: 'ch1Y', label: 'Ch1 Y Offset', type: 'number', default: 0, min: -100, max: 100 },
      { name: 'ch2X', label: 'Ch2 X Offset', type: 'number', default: 10, min: -100, max: 100 },
      { name: 'ch2Y', label: 'Ch2 Y Offset', type: 'number', default: 10, min: -100, max: 100 }
    ]
  },
  {
    id: 'flop',
    name: 'Flop',
    category: 'Transform',
    description: 'Flip image horizontally',
    args: []
  },
  {
    id: 'implode',
    name: 'Implode',
    category: 'Distort',
    description: 'Implode or explode pixels toward/away from center',
    args: [
      { name: 'amount', label: 'Amount', type: 'number', default: 50, min: -100, max: 100 }
    ]
  },
  {
    id: 'roll',
    name: 'Roll',
    category: 'Transform',
    description: 'Roll image horizontally and vertically',
    args: [
      { name: 'x', label: 'X Offset', type: 'number', default: 0, min: -1000, max: 1000 },
      { name: 'y', label: 'Y Offset', type: 'number', default: 0, min: -1000, max: 1000 }
    ]
  },
  {
    id: 'attenuate',
    name: 'Attenuate',
    category: 'Effects',
    description: 'Attenuate noise or image intensity',
    args: [
      { name: 'noise', label: 'Noise', type: 'select', default: 'gaussian', options: ['gaussian', 'impulse', 'laplacian', 'multiplicative', 'poisson', 'random'] },
      { name: 'amount', label: 'Amount', type: 'number', default: 0.5, min: 0, max: 1 }
    ]
  },
  {
    id: 'compress',
    name: 'Compress',
    category: 'Compression',
    description: 'Set compression type for output',
    args: [
      { name: 'type', label: 'Type', type: 'select', default: 'none', options: ['none', 'zip', 'bzip', 'fax', 'group4', 'jpeg', 'lossless', 'lzw', 'rle'] }
    ]
  },
  {
    id: 'shear',
    name: 'Shear',
    category: 'Distort',
    description: 'Shear image along X and Y axes',
    args: [
      { name: 'x', label: 'X Degrees', type: 'number', default: 0, min: -90, max: 90 },
      { name: 'y', label: 'Y Degrees', type: 'number', default: 0, min: -90, max: 90 }
    ]
  },
  {
    id: 'tint',
    name: 'Tint',
    category: 'Color',
    description: 'Apply a color tint to the image',
    args: [
      { name: 'color', label: 'Color', type: 'color', default: '#FF0000' },
      { name: 'amount', label: 'Amount (%)', type: 'number', default: 100, min: 0, max: 200 }
    ]
  },
  {
    id: 'modulate',
    name: 'Modulate',
    category: 'Color',
    description: 'Adjust brightness, saturation and hue',
    args: [
      { name: 'brightness', label: 'Brightness (%)', type: 'number', default: 100, min: 0, max: 300 },
      { name: 'saturation', label: 'Saturation (%)', type: 'number', default: 100, min: 0, max: 300 },
      { name: 'hue', label: 'Hue Shift (%)', type: 'number', default: 0, min: -180, max: 180 }
    ]
  },
  {
    id: 'contrast',
    name: 'Contrast',
    category: 'Color',
    description: 'Adjust image contrast',
    args: [
      { name: 'value', label: 'Amount', type: 'number', default: 0, min: -100, max: 100 }
    ]
  },
  {
    id: 'remap',
    name: 'Remap',
    category: 'Color',
    description: 'Remap colors to a palette',
    args: [
      { name: 'palette', label: 'Palette', type: 'colors', default: ['#FFFFFF', '#000000'], maxColors: 16 },
      { name: 'dither', label: 'Dither', type: 'select', default: 'none', options: ['none', 'FloydSteinberg', 'Riemersma', 'ordered-2x2', 'ordered-3x3', 'ordered-4x4', 'ordered-8x8'] }
    ]
  }
];