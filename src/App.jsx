import { useState, useRef } from "react";
import "./App.css";
function App() {
  const [imagePreviews, setImagePreviews] = useState([]);
  const [ditheredImages, setDitheredImages] = useState([]);
  const canvasRef = useRef(null);
  const handleFileChange = (event) => {
    const files = event.target.files;
    const newImages = [];
    const readerPromises = Array.from(files).slice(0, 5).map((file) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const imageSrc = reader.result;
          setImagePreviews((prev) => [...prev, imageSrc]);
          ditherImage(imageSrc).then((ditheredVariants) => {
            resolve(ditheredVariants);
          });
        };
        reader.readAsDataURL(file);
      });
    });
    Promise.all(readerPromises).then((results) => {
      const allDitheredImages = results.flat(); 
      setDitheredImages((prev) => [...prev, ...allDitheredImages]);
    });
  };
  const ditherImage = (imageSrc) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const floydSteinbergDithered = applyDither("floydSteinberg", data, canvas, ctx);
        const atkinsonDithered = applyDither("atkinson", data, canvas, ctx);
        const orderedDithered = applyDither("ordered", data, canvas, ctx);
        const stuckiDithered = applyDither("stucki", data, canvas, ctx);
        const jjnDithered = applyDither("jjn", data, canvas, ctx);
        resolve([floydSteinbergDithered, atkinsonDithered, orderedDithered,stuckiDithered, jjnDithered]);
      };
      img.src = imageSrc;
    });
  };
const applyDither = (algorithm, data, canvas, ctx) => {
  const imageDataCopy = new Uint8ClampedArray(data);

  switch (algorithm) {
    case "floydSteinberg":
      floydSteinbergDither(imageDataCopy, canvas.width, canvas.height);
      break;
    case "atkinson":
      atkinsonDither(imageDataCopy, canvas.width, canvas.height);
      break;
    case "ordered":
      orderedDither(imageDataCopy, canvas.width, canvas.height);
      break;
    case "stucki":
      stuckiDither(imageDataCopy, canvas.width, canvas.height);
      break;
    case "jjn":
      jjnDither(imageDataCopy, canvas.width, canvas.height);
      break;
    default:
      console.error("Unknown dithering algorithm: " + algorithm);
      return null;
  }

  const imageData = new ImageData(imageDataCopy, canvas.width, canvas.height);
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL(); 
};

const floydSteinbergDither = (data, width, height) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const gray = (r + g + b) / 3;
      const newColor = gray < 128 ? 0 : 255;
      data[index] = data[index + 1] = data[index + 2] = newColor;
      const error = gray - newColor;

      if (x + 1 < width) data[(y * width + (x + 1)) * 4] += error * 7 / 16;
      if (x - 1 >= 0 && y + 1 < height) data[((y + 1) * width + (x - 1)) * 4] += error * 3 / 16;
      if (y + 1 < height) data[((y + 1) * width + x) * 4] += error * 5 / 16;
      if (x + 1 < width && y + 1 < height) data[((y + 1) * width + (x + 1)) * 4] += error * 1 / 16;
    }
  }
};

const atkinsonDither = (data, width, height) => {
  const diffusionRatio = 1 / 8;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grayscale = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const newPixel = grayscale < 128 ? 0 : 255;
      const error = grayscale - newPixel;

      data[index] = data[index + 1] = data[index + 2] = newPixel;
      if (x + 1 < width) data[((y * width) + (x + 1)) * 4] += error * diffusionRatio;
      if (x + 2 < width) data[((y * width) + (x + 2)) * 4] += error * diffusionRatio;
      if (y + 1 < height) {
        if (x > 0) data[(((y + 1) * width) + (x - 1)) * 4] += error * diffusionRatio;
        data[(((y + 1) * width) + x) * 4] += error * diffusionRatio;
        if (x + 1 < width) data[(((y + 1) * width) + (x + 1)) * 4] += error * diffusionRatio;
      }
      if (y + 2 < height) data[(((y + 2) * width) + x) * 4] += error * diffusionRatio;
    }
  }
};

const stuckiDither = (data, width, height) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grayscale = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const newPixel = grayscale < 128 ? 0 : 255;
      const error = grayscale - newPixel;

      data[index] = data[index + 1] = data[index + 2] = newPixel;

      if (x + 1 < width) data[((y * width) + (x + 1)) * 4] += (error * 8) / 42; 
      if (y + 1 < height) {
        if (x > 0) data[(((y + 1) * width) + (x - 1)) * 4] += (error * 2) / 42; 
        data[(((y + 1) * width) + x) * 4] += (error * 4) / 42; 
        if (x + 1 < width) data[(((y + 1) * width) + (x + 1)) * 4] += (error * 4) / 42; 
      }
      if (y + 2 < height) {
        if (x > 0) data[(((y + 2) * width) + (x - 1)) * 4] += (error * 1) / 42; 
        data[(((y + 2) * width) + x) * 4] += (error * 2) / 42; 
        if (x + 1 < width) data[(((y + 2) * width) + (x + 1)) * 4] += (error * 1) / 42; 
      }
    }
  }
};

const orderedDither = (data, width, height) => {
  const bayerMatrix = [
    [0, 128, 32, 160, 8, 136, 40, 168, 2, 130, 34, 162, 10, 138, 42, 170],
    [192, 64, 224, 96, 200, 72, 232, 104, 194, 66, 226, 98, 202, 74, 234, 106],
    [48, 176, 16, 144, 56, 184, 24, 152, 50, 178, 18, 146, 58, 186, 26, 154],
    [240, 112, 208, 80, 248, 120, 216, 88, 242, 114, 210, 82, 250, 122, 218, 90],
    [12, 140, 44, 172, 4, 132, 36, 164, 14, 142, 46, 174, 6, 134, 38, 166],
    [204, 76, 236, 108, 196, 68, 228, 100, 206, 78, 238, 110, 198, 70, 230, 102],
    [60, 188, 28, 156, 52, 180, 20, 148, 62, 190, 30, 158, 54, 182, 22, 150],
    [252, 124, 220, 92, 244, 116, 212, 84, 254, 126, 222, 94, 246, 118, 214, 86],
    [3, 131, 35, 163, 11, 139, 43, 171, 1, 129, 33, 161, 9, 137, 41, 169],
    [195, 67, 227, 99, 203, 75, 235, 107, 193, 65, 225, 97, 201, 73, 233, 105],
    [51, 179, 19, 147, 59, 187, 27, 155, 49, 177, 17, 145, 57, 185, 25, 153],
    [243, 115, 211, 83, 251, 123, 217, 91, 241, 113, 209, 81, 249, 121, 215, 89],
    [15, 143, 47, 175, 7, 135, 39, 167, 13, 141, 45, 173, 5, 133, 37, 165],
    [207, 79, 239, 111, 197, 69, 229, 101, 205, 77, 237, 109, 199, 71, 231, 103],
    [63, 191, 31, 159, 55, 183, 23, 151, 61, 189, 29, 157, 53, 181, 21, 149],
    [255, 127, 223, 95, 253, 125, 221, 93, 250, 122, 218, 90, 254, 126, 222, 94],
  ];

  const matrixSize = 16; 

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grayscale = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const threshold = (bayerMatrix[y % matrixSize][x % matrixSize] / 255) * 255; 

      const newPixel = grayscale < threshold ? 0 : 255;
      data[index] = data[index + 1] = data[index + 2] = newPixel;
    }
  }
};

const jjnDither = (data, width, height) => {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const grayscale = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const newPixel = grayscale < 128 ? 0 : 255;
      const error = grayscale - newPixel;

      data[index] = data[index + 1] = data[index + 2] = newPixel;

      if (x + 1 < width) data[((y * width) + (x + 1)) * 4] += error * (7 / 48); 
      if (x + 2 < width) data[((y * width) + (x + 2)) * 4] += error * (5 / 48); 
      if (y + 1 < height) {
        data[(((y + 1) * width) + x) * 4] += error * (5 / 48); 
        if (x - 1 >= 0) data[(((y + 1) * width) + (x - 1)) * 4] += error * (3 / 48); 
        if (x + 1 < width) data[(((y + 1) * width) + (x + 1)) * 4] += error * (3 / 48); 
      }
      if (y + 2 < height) {
        data[(((y + 2) * width) + x) * 4] += error * (1 / 48); 
      }
    }
  }
};
  const handleDownload = (imageSrc, index) => {
    const link = document.createElement("a");
    link.href = imageSrc;
    link.download = `dithered-image-${index + 1}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  return (
    <>
      <div className="flex items-center justify-center">
        <div className="mx-auto w-11/12 min-w-[800px] bg-white">
          <form className="py-4 px-9">
            <div className="mb-6 pt-4">
              <input
                type="file"
                name="file"
                id="file"
                className="sr-only"
                multiple
                onChange={handleFileChange}
              />
              <label
                htmlFor="file"
                className="relative flex min-h-[200px] items-center justify-center rounded-md border border-dashed border-[#e0e0e0] p-12 text-center"
              >
                <div>
                  <span className="mb-2 block text-xl font-semibold text-[#07074D]">
                    Drop files here <br/>
                  </span>
                        <span className="mb-2 block text-lg  text-[#07074D]">
                 or
                  </span>
                  <span className="inline-flex rounded border text-[#e0e0e0] py-2 px-7 text-base font-medium bg-[#07074D]">
                    Browse
                  </span>
                </div>
              </label>
            </div>
          </form>
          {imagePreviews.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-[#07074D]">
              Original Image
              </h2>
              <div>
                {imagePreviews.map((imgSrc, index) => (
                  <img
                    key={index}
                    src={imgSrc}
                    alt={`Preview ${index + 1}`}
className="w-2/3 min-w-[200px] rounded-lg border border-gray-300 flex justify-center mx-auto"
                  />
                ))}
              </div>
            </div>
          )}
          {ditheredImages.length > 0 && (
            <div>
<h2 className="text-xl font-semibold text-[#07074D]">
  Dithered Images (Total: {ditheredImages.length})
</h2>
<div className="justify-center mx-auto grid grid-cols-5 gap-6 p-8 ">
  {ditheredImages.map((imgSrc, index) => (
    <div key={index} className="text-center flex flex-col items-center">
      <img
        src={imgSrc}
        alt={`Dithered Preview ${index + 1}`}
        className="min-w-[200px] w-auto rounded-lg border border-2 border-gray-300"
      />
      <button
        className="mt-2 w-full rounded text-[#e0e0e0] py-2 px-7 text-base font-medium bg-[#07074D] py-1 px-3"
        onClick={() => handleDownload(imgSrc, index)}
      >
        Download
      </button>
    </div>
  ))}
</div>
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </>
  );
}
export default App;
