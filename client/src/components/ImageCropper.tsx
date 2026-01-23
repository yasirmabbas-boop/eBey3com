import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RotateCw, RotateCcw, Check, X, Crop as CropIcon } from "lucide-react";

interface ImageCropperProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedImageUrl: string) => void;
  language?: string;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  language = "ar",
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [rotation, setRotation] = useState(0);
  const [aspect, setAspect] = useState<number | undefined>(1);
  const imgRef = useRef<HTMLImageElement>(null);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 1));
  }, []);

  const rotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const rotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const getCroppedImg = useCallback(async (): Promise<string> => {
    const image = imgRef.current;
    if (!image || !completedCrop) {
      return imageSrc;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return imageSrc;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    if (Math.abs(rotation) === 90 || Math.abs(rotation) === 270) {
      canvas.width = cropHeight;
      canvas.height = cropWidth;
    } else {
      canvas.width = cropWidth;
      canvas.height = cropHeight;
    }

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -cropWidth / 2,
      -cropHeight / 2,
      cropWidth,
      cropHeight
    );

    ctx.restore();

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(imageSrc);
          }
        },
        "image/jpeg",
        0.9
      );
    });
  }, [completedCrop, rotation, imageSrc]);

  const handleSave = async () => {
    const croppedUrl = await getCroppedImg();
    onCropComplete(croppedUrl);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            {language === "ar" ? "تعديل الصورة" : "دەستکاری وێنە"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-center gap-2 mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rotateLeft}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={rotateRight}
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAspect(aspect === 1 ? undefined : 1)}
            >
              {aspect === 1 
                ? (language === "ar" ? "حر" : "ئازاد")
                : "1:1"
              }
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAspect(4/3)}
            >
              4:3
            </Button>
          </div>

          <div className="flex justify-center bg-gray-100 rounded-lg p-2 overflow-hidden">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              className="max-h-[50vh]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop"
                onLoad={onImageLoad}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  maxHeight: "50vh",
                  maxWidth: "100%",
                }}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            <X className="h-4 w-4 ml-2" />
            {language === "ar" ? "إلغاء" : "هەڵوەشاندنەوە"}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
          >
            <Check className="h-4 w-4 ml-2" />
            {language === "ar" ? "حفظ" : "پاشەکەوت"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
