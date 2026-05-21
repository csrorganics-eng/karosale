import { renderToBuffer } from "@react-pdf/renderer";
import { PackagingTagDocument, type PackagingTagData } from "./packaging-tag";

export async function generatePackagingPdfBuffer(data: PackagingTagData): Promise<Buffer> {
  const buffer = await renderToBuffer(<PackagingTagDocument data={data} />);
  return Buffer.from(buffer);
}
