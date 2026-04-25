from PIL import Image
import sys

def make_transparent(img_path, output_path):
    img = Image.open(img_path).convert("RGBA")
    datas = img.getdata()

    newData = []
    # Magenta is roughly (255, 0, 255)
    # We allow some tolerance for compression artifacts
    for item in datas:
        if item[0] > 200 and item[1] < 100 and item[2] > 200:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    make_transparent(sys.argv[1], sys.argv[2])
