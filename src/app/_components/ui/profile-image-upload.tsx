import { useUploadFile } from "better-upload/client";
import Image from "next/image";
import { useRef } from "react";

type ProfileImageUploadProps = Parameters<typeof useUploadFile>[0] & {
  accept?: string;
  metadata?: Record<string, unknown>;
  imageUrl: string;
  alt?: string;
  size?: number;
};

export function ProfileImageUpload({
  accept = "image/*",
  metadata,
  imageUrl,
  alt = "Profile",
  size = 64,
  ...params
}: ProfileImageUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const { upload, isPending } = useUploadFile({
    ...params,
    onUploadSettled: () => {
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      params.onUploadSettled?.();
    },
  });

  return (
    <div className="relative">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            upload(e.target.files[0], { metadata });
          }
        }}
      />
      <button
        type="button"
        disabled={isPending}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            inputRef.current?.click();
          }
        }}
        className="focus:outline-none"
      >
        <div
          className="relative overflow-hidden rounded-full ring-1 ring-gray-200 focus-within:ring-2 focus-within:ring-primary"
          style={{ width: size, height: size }}
        >
          <Image
            src={imageUrl}
            alt={alt}
            width={size}
            height={size}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
              isPending ? "opacity-50" : ""
            }`}
          />
          {isPending && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            </div>
          )}
        </div>
      </button>
    </div>
  );
}
