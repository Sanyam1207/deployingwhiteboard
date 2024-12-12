import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from ".";
import { toolTypes } from "../../constants";

const drawPencilElement = (context, element) => {
  const myStroke = getStroke(element.points, {
    size: 3,
  });

  const pathData = getSvgPathFromStroke(myStroke);

  const myPath = new Path2D(pathData);
  context.fill(myPath);
};

const drawTextElement = (context, element) => {
  context.textBaseline = "top";
  context.font = "24px sans-serif";
  context.fillText(element.text, element.x1, element.y1);
};

const drawImageElement = (context, element) => {
  const img = new Image()
  img.src = element.src
  context.drawImage(img, element.x1, element.y1, img.naturalWidth/6, img.naturalHeight/6);
}

export const drawElement = ({ roughCanvas, context, element }) => {
  switch (element.type) {
    case toolTypes.RECTANGLE:
    case toolTypes.LINE:
      return roughCanvas.draw(element.roughElement);
    case toolTypes.PENCIL:
      drawPencilElement(context, element);
      break;
    case toolTypes.TEXT:
      drawTextElement(context, element);
      break;
    case toolTypes.IMAGE:
      drawImageElement(context, element)
      break;
    default:
      throw new Error("Something went wrong when drawing element");
  }
};
