export interface IconConfig {
  format: "png" | "ico" | "svg";
  name: string;
  outDir: string;
  size?: number;
}

export interface GenerateIconsOptions {
  baseDir: string;
  icons: IconConfig[];
  svgPath: string;
}

export declare function generateIcons(options: GenerateIconsOptions): Promise<void>;
