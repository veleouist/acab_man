/** Draws a responsive, cover-cropped scene without distorting the supplied image. */
export class Background {
  constructor(imageUrl) {
    this.image = new Image();
    this.image.src = imageUrl;
  }

  draw(context, area) {
    const { x, y, width, height } = area;
    const imageReady = this.image.complete && this.image.naturalWidth > 0;

    if (!imageReady) {
      context.fillStyle = "#172033";
      context.fillRect(x, y, width, height);
      return;
    }

    const sourceAspectRatio = this.image.naturalWidth / this.image.naturalHeight;
    const targetAspectRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = this.image.naturalWidth;
    let sourceHeight = this.image.naturalHeight;

    if (sourceAspectRatio > targetAspectRatio) {
      sourceWidth = sourceHeight * targetAspectRatio;
      sourceX = (this.image.naturalWidth - sourceWidth) / 2;
    } else {
      sourceHeight = sourceWidth / targetAspectRatio;
      // Preserve slightly more of the square's buildings than its foreground.
      sourceY = (this.image.naturalHeight - sourceHeight) * 0.43;
    }

    context.drawImage(this.image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    context.fillStyle = "rgba(8, 15, 28, 0.46)";
    context.fillRect(x, y, width, height);
  }
}
