import tokenizer
from pprint import pprint

# text = ("Málinu var vísað til stjórnskipunar- og eftirlitsnefndar "
#     "skv. 3. gr. XVII. kafla laga nr. 10/2007 þann 3. janúar 2010.")

text = (
    "Manninum á verkstæðinu vanntar hamar. Guðjón setti kókið í kælir.\n"
    "Mér dreimdi stórann brauðhleyf."
)

for token in tokenizer.tokenize(text):

    # print("{0}: '{1}' {2} {3}".format(
    #     TOK.descr[token.kind],
    #     token.txt or "-",
    #     token.val or "",
    #     token.origin_spans))

    print(token)

    # pprint(dir(token))

    # 'as_tuple',
    # 'concatenate',
    # 'equal',
    # 'has_meanings',
    # 'integer',
    # 'kind',
    # 'meanings',
    # 'number',
    # 'ordinal',
    # 'origin_spans',
    # 'original',
    # 'person_names',
    # 'punctuation',
    # 'split',
    # 'substitute',
    # 'substitute_all',
    # 'substitute_longer',
    # 'txt',
    # 'val'