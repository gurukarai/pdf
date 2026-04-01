import React, { useState } from 'react';
import { Image, Scissors, Minimize2, FileImage, Frame, Palette } from 'lucide-react';
import BulkImageSplitter from './BulkImageSplitter';
import ImageConverter from './ImageConverter';
import ImageCropper from './ImageCropper';
import ImageCompressor from './ImageCompressor';
import ImageBorder from './ImageBorder';
import RGBtoCMYKConverter from './RGBtoCMYKConverter';

type ToolType = 'converter' | 'cropper' | 'splitter' | 'compressor' | 'border' | 'cmyk' | null;

export default function ImageTools() {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);

  const tools = [
    {
      id: 'converter' as ToolType,
      name: 'Convert Image',
      description: 'Convert images between different formats',
      icon: FileImage,
      bgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      id: 'cropper' as ToolType,
      name: 'Crop Image',
      description: 'Crop images using percentage values',
      icon: Scissors,
      bgColor: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      id: 'splitter' as ToolType,
      name: 'Bulk Image Splitter',
      description: 'Split images into smaller pieces',
      icon: Image,
      bgColor: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      id: 'compressor' as ToolType,
      name: 'Compress Image',
      description: 'Reduce image file size',
      icon: Minimize2,
      bgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
    },
    {
      id: 'border' as ToolType,
      name: 'Add Border',
      description: 'Add customizable borders to images',
      icon: Frame,
      bgColor: 'bg-pink-100',
      iconColor: 'text-pink-600',
    },
    {
      id: 'cmyk' as ToolType,
      name: 'RGB to CMYK',
      description: 'Convert RGB images to CMYK for professional printing',
      icon: Palette,
      bgColor: 'bg-cyan-100',
      iconColor: 'text-cyan-600',
    },
  ];

  if (selectedTool) {
    return (
      <div>
        <button
          onClick={() => setSelectedTool(null)}
          className="mb-6 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          ← Back to Image Tools
        </button>

        {selectedTool === 'converter' && <ImageConverter />}
        {selectedTool === 'cropper' && <ImageCropper />}
        {selectedTool === 'splitter' && <BulkImageSplitter />}
        {selectedTool === 'compressor' && <ImageCompressor />}
        {selectedTool === 'border' && <ImageBorder />}
        {selectedTool === 'cmyk' && <RGBtoCMYKConverter />}
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-slate-800 mb-3">Image Tools</h1>
        <p className="text-lg text-slate-600">
          Professional image manipulation tools for all your needs
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-left hover:shadow-md hover:border-slate-300 transition-all group"
            >
              <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-6 h-6 ${tool.iconColor}`} />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">{tool.name}</h3>
              <p className="text-slate-600">{tool.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
