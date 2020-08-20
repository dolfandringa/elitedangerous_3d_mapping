import pickle
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import pandas as pd
import requests
from functools import reduce
import re
import json
import logging

logging.basicConfig(format='%(asctime)s-%(name)s: %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logging.getLogger('nsp_mapping').setLevel(logging.DEBUG)
log = logging.getLogger('nsp_mapping.load_sheet_data')

number_re =  re.compile('^([0-9\.-]+).*')

SYSTEMS = {}

def process_line(result, line):
    log.debug("Line: %s", line)
    if line == [] or  'systems here' in line[0].lower():
        return result
       
    if line[0] == '':
        line[0] = result[-1][0]
  
    if len(line) < 2:
        line.append(result[-1][1])
    elif line[1].strip() == '':
        line[1] = result[-1][1]
    system_name = line[1]
    
    system = SYSTEMS.setdefault(system_name, {'x': -1, 'y': -1, 'z': -1, 'num_sites': 0})
    if len(result):
        prev_system_name = result[-1][1]
        prev_system = SYSTEMS[prev_system_name]
    else:
        prev_system_name = None
        prev_system = None
    
    if len(line) > 2:
        #remove the number of sites and keep that separate.
        try:
            num_sites  = number_re.sub(r'\1', line.pop(2).strip()) or 0
            system['num_sites'] = max(system['num_sites'], num_sites)
        except TypeError:
            pass
    line = line + (14-len(line)) * [None] # Pad with None values until we have the full 14 columns
    if (line[11], line[12], line[13]) != (None, None, None):
        #We have 3 coordinate fields
        if number_re.match(line[11].strip()) and number_re.match(line[12].strip()) and number_re.match(line[13].strip()):
            #remove any additional characters after the coordinates
            system['x'] = float(number_re.sub(r'\1', line[11].strip()))
            system['y'] = float(number_re.sub(r'\1', line[12].strip()))
            system['z'] = float(number_re.sub(r'\1', line[13].strip()))
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
    
    #Replace empty strings with None
    line = list(map(lambda x: None if isinstance(x, str) and x.strip() == '' else x, line))
    
    result.append(line)
    return result

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

# The ID and range of a sample spreadsheet.
SAMPLE_SPREADSHEET_ID = '1k5gf13mvScxpxxUYWxFWG08mBYB6AXiRLUrtFJj_2Y0'
SAMPLE_RANGE_NAME = 'NSP SYSTEM DATA!A3:O5000'
creds = get_creds()
service = build('sheets', 'v4', credentials=creds)
sheet = service.spreadsheets()
result = sheet.values().get(spreadsheetId=SAMPLE_SPREADSHEET_ID,
                            range=SAMPLE_RANGE_NAME).execute()
values = reduce(process_line, result.get('values', []), [])
columns = ['added_by', 'system_name', 'mollusc', 'lagrange_cloud', 'ice_crystal', 'metallic_crystal', 'silicate_crystal','solid_mineral','empty1','distance_to_nearest_star','empty2','x','y','x']
sites = pd.DataFrame(values, columns=columns)