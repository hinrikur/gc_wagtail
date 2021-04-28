import requests
import json
from pprint import pprint

# The text to check, two paragraphs of two and one sentences, respectively
my_text = (
    "Manninum á verkstæðinu vanntar hamar. Guðjón setti kókið í kælir.\n"
    "Mér dreimdi stórann brauðhleyf."
)

# Make the POST request, submitting the text
rq = requests.post("https://yfirlestur.is/correct.api", data=dict(text=my_text))

# Retrieve the JSON response
resp = rq.json()

# Enumerate through the returned paragraphs, sentences and annotations
for ix, pg in enumerate(resp["result"]):
    print(f"\n{ix+1}. efnisgrein")
    for sent in pg:
        print(f"   {sent['corrected']}")
        for ann in sent["annotations"]:
            print(
                f"      {ann['start']:03} {ann['end']:03} "
                f"{ann['code']:20} {ann['text']}"
            )


pprint(resp)