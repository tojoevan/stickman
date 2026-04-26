from PIL import Image
import sys

def flip_image(path):
    img = Image.open(path)
    flipped_img = img.transpose(Image.FLIP_LEFT_RIGHT)
    flipped_img.save(path)

if __name__ == "__main__":
    flip_image(sys.argv[1])
