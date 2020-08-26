import pickle
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pandas as pd
import requests
import matplotlib.pyplot as plt
from functools import reduce
import re
import numpy as np
import json
import logging
import open3d as o3d
from fuzzywuzzy import process
import json

logging.basicConfig(format='%(asctime)s-%(name)s: %(message)s', level=logging.ERROR, datefmt='%Y-%m-%d %H:%M:%S')
logging.getLogger('nsp_mapping').setLevel(logging.DEBUG)
log = logging.getLogger('nsp_mapping.load_sheet_data')


species = {
    'mollusc': ['BULLET',
        'CEREUM, BULLET',
        'FLAVUM, BULLET',
        'LIVIDUM, BULLET',
        'RUBEUM, BULLET',
        'VIRIDE, BULLET'],
    'lagrange_cloud': ['CAERULEUM', 'CROCEUM', 'LUTEOLUM', 'PROTO', 'ROSEUM', 'RUBICUNDUM', 'VIRIDE'],
    'ice_crystal': ['ALBIDUM', 'FLAVUM', 'LINDIGOTICUM', 'PRASINUM', 'PURPUREUM', 'ROSEUM', 'RUBEUM'],
    'metallic_crystal': ['ALBIDUM', 'FLAVUM', 'LINDIGOTICUM', 'PRASINUM', 'PURPUREUM', 'ROSEUM', 'RUBEUM'],
    'silicate_crystal': ['ALBIDUM', 'FLAVUM', 'LINDIGOTICUM', 'PRASINUM', 'PURPUREUM', 'ROSEUM', 'RUBEUM', 'SOLID SPHERES'],
    'solid_mineral': ['SOLID SPHERES']
}

number_re =  re.compile('^([0-9\.-]*).*')

def get_matches(value, l):
    matches = process.extract(value, l)
    if matches[0][1] == 100:
        return [matches[0][0]]
    return [m[0] for m in matches if m[1]>60]

def isfloat(value):
    try:
        float(value)
        return True
    except ValueError:
        return False

def columnToSpecies(name):
    group, species = name.split('_', 1)
    species = " " .join([v.capitalize() for v in species.split('_')])
    return group, species

def speciesToColumn(group, species):
    return f"{group}_{species.lower().replace(', ','_')}"

species_column_names = [speciesToColumn(k, sp) for k,v in species.items() for sp in v]

def process_line(result, line):
    (systems, sites, rownum) = result
    rownum+=1
    log.debug("Line: %s", line)
    if line == [] or  'systems here' in line[0].lower():
        return (systems, sites, rownum)
       
    if line[0] == '':
        line[0] = sites[-1][1]
  
    if len(line) < 2:
        line.append(sites[-1][2])
    elif line[1].strip() == '':
        line[1] = sites[-1][2]
    system_name = line[1]
    
    system = systems.setdefault(system_name, {'x': -1, 'y': -1, 'z': -1, 'num_sites': 0})
    if len(sites):
        prev_system_name = sites[-1][2]
        prev_system = systems[prev_system_name]
    else:
        prev_system_name = None
        prev_system = None
    
    if len(line) > 2:
        #remove the number of sites and keep that separate.
        try:
            num_sites  = int(number_re.sub(r'\1', line.pop(2).strip()) or 0)
            system['num_sites'] = max(system['num_sites'], num_sites)
        except TypeError:
            pass
    line = line + (14-len(line)) * [None] # Pad with None values until we have the full 14 columns
    if (line[11], line[12], line[13]) != (None, None, None):
        #We have 3 coordinate fields
        x = number_re.sub(r'\1', line[11].strip())
        y = number_re.sub(r'\1', line[12].strip())
        z = number_re.sub(r'\1', line[13].strip())
        if isfloat(x) and isfloat(y) and isfloat(z):
            #remove any additional characters after the coordinates
            system['x'] = float(x)
            system['y'] = float(y)
            system['z'] = float(z)
    if (system['x'], system['y'], system['z']) == (-1, -1, -1):
        if system_name == prev_system_name:
            system['x'] = prev_system['x']
            system['y'] = prev_system['y']
            system['z'] = prev_system['z']
        else:
            (system['x'], system['y'], system['z']) = lookup_coords(system_name)

    line[11] = system['x']
    line[12] = system['y']
    line[13] = system['z']
    
    #Replace empty strings with None and add the original row number from the google sheet
    line = [rownum] + list(map(lambda x: None if isinstance(x, str) and x.strip() == '' else x, line))
    
    sites.append(line)
    return (systems, sites, rownum)

def lookup_coords(system_name):
    url = f"https://www.edsm.net/api-v1/system?showCoordinates=1&systemName={system_name}"
    r = requests.get(url)
    if r.status_code != 200:
        return (-1, -1, -1)
    json = r.json()
    if json == [] or 'coords' not in json.keys():
        return (-1, -1, -1)
    coords = json['coords']
    return (coords['x'], coords['y'], coords['z'])

def get_creds():
    creds = None
    # The file token.pickle stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    # If there are no (valid) credentials available, let the user log in.

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', scopes)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return creds

def read_gsheet():
    # The ID and range of a sample spreadsheet.
    SAMPLE_SPREADSHEET_ID = '1k5gf13mvScxpxxUYWxFWG08mBYB6AXiRLUrtFJj_2Y0'
    START_ROW = 3
    END_ROW = 5000
    SAMPLE_RANGE_NAME = f"NSP SYSTEM DATA!A{START_ROW}:O{END_ROW}"
    creds = get_creds()
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SAMPLE_SPREADSHEET_ID,
                                range=SAMPLE_RANGE_NAME).execute()
    sites = []
    systems = {}
    reduce(process_line, result.get('values', []), (systems, sites, START_ROW-1))
    columns = ['gsheet_rownum', 'added_by', 'system_name', 'mollusc', 'lagrange_cloud', 'ice_crystal', 'metallic_crystal', 'silicate_crystal','solid_mineral','empty1','distance_to_nearest_star','empty2','x','y','x']
    sites = pd.DataFrame(sites, columns=columns)
    systems = pd.DataFrame.from_dict(systems, orient='index')

    return (systems, sites)
    
def calculate_columns(systems, sites):
    systems = systems.copy()
    sites = sites.copy()
    for col in species.keys():
        for sp in species[col]:
            sites[f"{col}_{sp.lower().replace(', ','_')}"] = sites.apply(lambda row: row[col] is not None and sp in get_matches(row[col], species[col]), axis=1)
    agg_columns = dict([(v, np.max) for v in species_column_names])
    agg_columns['added_by'] = lambda x: x.iloc[0]
    systems = systems.join(sites[['system_name', 'added_by']+species_column_names].groupby(by=['system_name']).agg(agg_columns))
    for group in species.keys():
        columns = [k for k in species_column_names if k.startswith(group)]
        systems[group] = systems.apply(lambda row: ", ".join([columnToSpecies(col)[1] for col in columns if row[col]]) or None, axis=1)
    return systems, sites

def save_data(systems, sites):
    systems.to_hdf('banana_nebula_nsp.h5', 'systems', format='table')
    sites.to_hdf('banana_nebula_nsp.h5', 'sites', format='table')


def save_layers(layers, tables):
    for k, v in layers.items():
        o3d.io.write_point_cloud(f'docs/{k}.pcd', v)
    for k, v in tables.items():
        with open(f'docs/{k}.json', 'w') as f:
            f.write(json.dumps(v))

def load_data():
    store = pd.HDFStore('banana_nebula_nsp.h5')
    systems = store.get('/systems')
    sites = store.get('/sites')
    return (systems, sites)

def generate_layers(systems):
    pcd = o3d.geometry.PointCloud()
    color = (0.0,0.0,0.0)
    
    json_columns = ['system_name','added_by','num_sites','mollusc', 'lagrange_cloud', 'ice_crystal', 'metallic_crystal', 'silicate_crystal','solid_mineral','x','y','z']
    
    
    systems['system_name'] = systems.index
    layer_systems = systems.replace({np.nan: None}).round({'x': 2, 'y': 2, 'z': 2})
    
    pcd.points = o3d.utility.Vector3dVector(layer_systems[['x','y','z']].to_numpy())
    pcd.colors = o3d.utility.Vector3dVector([color for i in range(len(layer_systems))])
    
    d = layer_systems[json_columns].to_dict('records')
    
    num_groups = len(species.keys())
    layers = {'all_systems': pcd}
    tables = {'all_systems': d}
    for i, group in enumerate(species.keys()):
        color = plt.cm.viridis(i/num_groups)
        pcd = o3d.geometry.PointCloud()
        layer_systems = systems[systems[group].notnull()].replace({np.nan: None}).round({'x': 2, 'y': 2, 'z': 2})
        pcd.points = o3d.utility.Vector3dVector(layer_systems[['x','y','z']].to_numpy())
        pcd.colors = o3d.utility.Vector3dVector([color[:3] for i in range(len(layer_systems))])
        layers[group] = pcd

        d = layer_systems[json_columns].to_dict('records')
        tables[group] = d
    return layers, tables
    
def main():
    systems, sites = read_gsheet()
    systems, sites = calculate_columns(systems, sites)
    layers, tables = generate_layers(systems[systems['x'] != -1])
    save_data(systems, sites)
    save_layers(layers, tables)