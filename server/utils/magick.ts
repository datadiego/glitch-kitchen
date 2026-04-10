import type { OperationRecipe } from '../types/operations';

function resolveRandomValue(value: unknown): unknown {
  if (typeof value === 'string' && value.includes(':')) {
    const parts = value.split(':');
    const minStr = parts[0];
    const maxStr = parts[1];
    if (minStr !== undefined && maxStr !== undefined && parts.length === 2) {
      const min = parseFloat(minStr);
      const max = parseFloat(maxStr);
      if (!isNaN(min) && !isNaN(max)) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    }
  }
  return value;
}

export function resolveOperationArgs(args: Record<string, unknown>): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    resolved[key] = resolveRandomValue(value);
  }
  return resolved;
}

export function buildMagickCommand(operations: OperationRecipe[]): string[] {
  const parts: string[] = [];
  
  for (const op of operations) {
    const resolvedArgs = resolveOperationArgs(op.args);
    switch (op.id) {
      case 'resize':
        const { scale, interpolate, filter } = resolvedArgs as { scale: number; interpolate: string; filter: string };
        parts.push('-filter', filter);
        parts.push('-interpolate', interpolate);
        parts.push('-resize', `${scale}%`);
        break;
      case 'rotate':
        parts.push('-rotate', String(resolvedArgs.degrees));
        break;
      case 'sampling':
        parts.push('-sampling-factor', String(resolvedArgs.factor));
        break;
      case 'quality':
        parts.push('-quality', String(resolvedArgs.value));
        break;
      case 'saturate':
        parts.push('-modulate', `100,${resolvedArgs.amount},100`);
        break;
      case 'modulate':
        const modArgs = resolvedArgs as { brightness: number; saturation: number; hue: number };
        const hueValue = 100 + (modArgs.hue * 100 / 180);
        parts.push('-modulate', `${modArgs.brightness},${modArgs.saturation},${hueValue}`);
        break;
      case 'contrast':
        const contrastArgs = resolvedArgs as { value: number };
        if (contrastArgs.value > 0) {
          parts.push('-sigmoidal-contrast', `${contrastArgs.value},50%`);
        } else if (contrastArgs.value < 0) {
          parts.push('+sigmoidal-contrast', `${Math.abs(contrastArgs.value)},50%`);
        }
        break;
      case 'dither':
        const ditherArgs = resolvedArgs as { method: string; levels: number };
        if (ditherArgs.method.startsWith('ordered')) {
          parts.push('-ordered-dither', ditherArgs.method.replace('ordered-', ''));
        } else if (ditherArgs.method !== 'None') {
          parts.push('-dither', ditherArgs.method);
        }
        parts.push('-colors', String(ditherArgs.levels));
        break;
      case 'posterize':
        parts.push('-posterize', String(resolvedArgs.levels));
        break;
      case 'threshold':
        parts.push('-threshold', `${resolvedArgs.value}%`);
        break;
      case 'normalize':
        parts.push('-normalize');
        break;
      case 'gamma':
        parts.push('-gamma', String(resolvedArgs.value));
        break;
      case 'level':
        parts.push('-level', `${resolvedArgs.black}%,${resolvedArgs.white}%,${resolvedArgs.gamma}`);
        break;
      case 'grayscale':
        parts.push('-grayscale', String(resolvedArgs.method));
        break;
      case 'quantize':
        if (resolvedArgs.pattern !== 'none') {
          parts.push('-ordered-dither', String(resolvedArgs.pattern));
        }
        parts.push('-colors', String(resolvedArgs.colors));
        break;
      case 'blur':
        parts.push('-blur', `0x${resolvedArgs.radius}`);
        break;
      case 'sharpen':
        parts.push('-sharpen', `0x${resolvedArgs.radius}`);
        break;
      case 'spread':
        parts.push('-spread', String(resolvedArgs.amount));
        break;
      case 'noise':
        const noiseArgs = resolvedArgs as { type: string; amount: number; high: number };
        if (noiseArgs.type === 'RandomThreshold') {
          parts.push('-random-threshold', `${noiseArgs.amount},${noiseArgs.high}`);
        } else if (noiseArgs.type === 'RandomColor') {
          const mix = noiseArgs.amount / 100;
          parts.push('-fx', `u*${1-mix}+rand()*${mix}`);
        } else {
          parts.push('-statistic', 'NonPeak', String(noiseArgs.amount));
        }
        break;
      case 'shade':
        parts.push('-shade', `${resolvedArgs.azimuth}x${resolvedArgs.elevation}`);
        break;
      case 'swirl':
        parts.push('-swirl', String(resolvedArgs.degrees));
        break;
      case 'wave':
        parts.push('-wave', `${resolvedArgs.amplitude}x${resolvedArgs.wavelength}`);
        break;
      case 'solarize':
        parts.push('-solarize', `${resolvedArgs.threshold}%`);
        break;
      case 'monochrome':
        parts.push('-monochrome');
        break;
      case 'negate':
        parts.push('-negate');
        break;
      case 'flip':
        parts.push('-flip');
        break;
      case 'flop':
        parts.push('-flop');
        break;
      case 'colorspace':
        parts.push('-colorspace', String(resolvedArgs.space));
        break;
      case 'channel-shift':
        const shiftArgs = resolvedArgs as { colorspace: string; ch1X: number; ch1Y: number; ch2X: number; ch2Y: number };
        parts.push('-colorspace', shiftArgs.colorspace, '-separate');
        const ch1X = shiftArgs.ch1X || 0;
        const ch1Y = shiftArgs.ch1Y || 0;
        const ch2X = shiftArgs.ch2X || 0;
        const ch2Y = shiftArgs.ch2Y || 0;
        parts.push(
          '(', '-clone', '0', ')',
          '(', '-clone', '1', '-roll', `+${ch1X}+${ch1Y}`, ')',
          '(', '-clone', '2', '-roll', `+${ch2X}+${ch2Y}`, ')',
          '-delete', '0-2',
          '-combine'
        );
        break;
      case 'implode':
        parts.push('-implode', String(resolvedArgs.amount));
        break;
      case 'roll':
        parts.push('-roll', `+${resolvedArgs.x}+${resolvedArgs.y}`);
        break;
      case 'attenuate':
        parts.push('-attenuate', String(resolvedArgs.amount));
        if (resolvedArgs.noise !== 'gaussian') {
          parts.push('+noise', String(resolvedArgs.noise).trim());
        }
        break;
      case 'compress':
        parts.push('-compress', String(resolvedArgs.type));
        break;
      case 'shear':
        parts.push('-shear', `${resolvedArgs.x}x${resolvedArgs.y}`);
        break;
      case 'tint':
        const tintArgs = resolvedArgs as { color: string; amount: number };
        const tintHex = tintArgs.color.startsWith('#') ? tintArgs.color : `#${tintArgs.color}`;
        const percent = Math.min(100, tintArgs.amount);
        parts.push('-fill', tintHex, '-tint', `${percent}%`);
        break;
      case 'remap':
        const remapArgs = resolvedArgs as { palette: unknown; dither: string };
        const colors = Array.isArray(remapArgs.palette) ? remapArgs.palette : [remapArgs.palette];
        if (colors.length > 0) {
          if (remapArgs.dither !== 'none') {
            if (remapArgs.dither.startsWith('ordered')) {
              parts.push('-ordered-dither', remapArgs.dither.replace('ordered-', ''));
            } else {
              parts.push('-dither', remapArgs.dither);
            }
          }
          parts.push('(');
          (colors as string[]).forEach(color => {
            const hexColor = color.startsWith('#') ? color : `#${color}`;
            parts.push('xc:' + hexColor);
          });
          parts.push('+append', '-write', 'mpr:palette', '+delete', ')');
          parts.push('-remap', 'mpr:palette');
        }
        break;
    }
  }
  
  return parts;
}

export function buildMagickCommandString(operations: OperationRecipe[]): string {
  const parts = buildMagickCommand(operations);
  return 'magick ' + parts.join(' ');
}

export function generateScript(pipelines: { name: string; repeat: number; recipe: OperationRecipe[] }[]): string {
  const lines: string[] = [
    '#!/bin/bash',
    '',
    '# Glitch Kitchen Script',
    '# Generated automatically',
    '',
    'set -e',
    '',
    'INPUT="${1:-input.png}"',
    'BASENAME="${INPUT%.*}"',
    'EXT="${INPUT##*.}"',
    ''
  ];

  let outputVar = '$INPUT';
  let intermediateCount = 0;

  for (let p = 0; p < pipelines.length; p++) {
    const pipeline = pipelines[p];
    const pipelineName = pipeline.name || `Pipeline ${p + 1}`;

    lines.push(`# ${pipelineName}`);
    lines.push('');

    for (let r = 0; r < pipeline.repeat; r++) {
      const currentInput = outputVar;
      const currentOutput = p === pipelines.length - 1 && r === pipeline.repeat - 1
        ? '${BASENAME}_glitched.${EXT}'
        : intermediateCount === 0
          ? '${BASENAME}_step1.${EXT}'
          : '${BASENAME}_step' + (intermediateCount + 1) + '.${EXT}';

      if (pipeline.recipe.length > 0) {
        const cmdParts = buildMagickCommand(pipeline.recipe);
        const cmdStr = 'magick ' + currentInput + ' ' + cmdParts.join(' ') + ' ' + currentOutput;
        lines.push(cmdStr);
        outputVar = currentOutput;
        intermediateCount++;
      }
    }
    lines.push('');
  }

  lines.push('echo "Done! Output: ${BASENAME}_glitched.${EXT}"');

  return lines.join('\n');
}