import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

export type UploadableFile = Blob & {
  name?: string;
  type?: string;
  size?: number;
};

function fileNameFromUri(uri: string, fallback: string) {
  const clean = uri.split("?")[0] || "";
  return decodeURIComponent(clean.split("/").filter(Boolean).pop() || fallback);
}

async function blobFromAsset(asset: { uri: string; name?: string | null; mimeType?: string | null; type?: string | null }) {
  const response = await fetch(asset.uri);
  const blob = await response.blob();
  const name = asset.name || fileNameFromUri(asset.uri, "vocarush-upload");
  const type = asset.mimeType || asset.type || blob.type || "application/octet-stream";
  return Object.assign(blob, { name, type }) as UploadableFile;
}

export async function pickImageUploadFile(): Promise<UploadableFile | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.9,
    allowsMultipleSelection: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return blobFromAsset({
    uri: asset.uri,
    name: asset.fileName || fileNameFromUri(asset.uri, "vocarush-image.jpg"),
    mimeType: asset.mimeType || "image/jpeg",
  });
}

export async function pickDocumentUploadFile(types: string | string[] = "*/*"): Promise<UploadableFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.file) return asset.file as UploadableFile;
  return blobFromAsset({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
  });
}
