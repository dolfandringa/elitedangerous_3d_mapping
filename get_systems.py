import gzip
import json
import pandas as pd
import logging

log = logging.getLogger('clustering.extract_data')

system_list = []
i=0
log.debug("Start reading the json file")
with open('systemsWithCoordinates.json','r') as f:
    line = f.readline()
    while line != '':
        if line.strip() in ['[',']']:
            line = f.readline()
            i+=1
            continue
        line = line.strip().strip(',')
        if line.count('{') != line.count('}'):
            log.error(f"Line {i} is incomplete")
            line = f.readline()
            i+=1
            continue
        try:
            s = json.loads(line)
        except Exception as e:
            log.error(f"Error in line {i}.")
            log.exception(e)
            line = f.readline()
            i+=1
            continue
        system_list.append({
            'id64': s['id64'],
            'system_name': s['name'],
            'x': s['coords']['x'],
            'y': s['coords']['y'],
            'z': s['coords']['z']
        })
        i+=1
        if(i % 1000000 == 0):
            print(f"Read {i} lines")
            systems = pd.DataFrame(system_list)
            systems.set_index('id64')
            systems.to_hdf('systems.h5', 'table', append=True, data_columns=['system_name','id64','x','y','z'], min_itemsize={'id64': 64, 'system_name': 255})
            system_list = []
        line = f.readline()
log.debug("Done reading data")
systems = pd.DataFrame(system_list)
systems.set_index('id64')
del system_list
log.debug("Writing to disk")
systems.to_hdf('systems.h5', 'table', append=True, data_columns=['system_name','id64','x','y','z'], min_itemsize={'id64': 64, 'system_name': 255})