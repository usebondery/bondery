export interface IconConfig {
  name: string;
  size?: number;
  format: "png" | "ico" | "svg";
  outDir: string;
}

export interface GenerateIconsOptions {
  svgPath: string;
  icons: IconConfig[];
  baseDir: string;
}

export declare function generateIcons(options: GenerateIconsOptions): Promise<void>;
