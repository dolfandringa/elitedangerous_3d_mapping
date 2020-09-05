import pandas as pd
import json

sector_list = []
sectors = pd.read_csv('../../sector-list.csv',
                      delimiter=',', header=0, index_col='Sector')
sectors["Size X"] = sectors["Max X"] - sectors["Min X"]
sectors["Size Y"] = sectors["Max Y"] - sectors["Min Y"]
sectors["Size Z"] = sectors["Max Z"] - sectors["Min Z"]
for name, sector in sectors[(sectors["Size Y"] > 0) & (sectors["Size X"] > 0) & (sectors["Size Z"] > 0)].iterrows():
    sector_list.append({
        'sectorName': name,
        'numSystems': sector["Systems"],
        'min': {
            'x': sector["Min X"],
            'y': sector["Min Y"],
            'z': sector["Min Z"]
        },
        'max': {
            'x': sector["Max X"],
            'y': sector["Max Y"],
            'z': sector["Max Z"]
        },
        'center': {
            'x': sector["Avg X"],
            'y': sector["Avg Y"],
            'z': sector["Avg Z"]
        },
        'size': {
            'x': sector["Size X"],
            'y': sector["Size Y"],
            'z': sector["Size Z"]
        }
    })

open('../docs/sectors.json', 'w').write(json.dumps(sector_list))
