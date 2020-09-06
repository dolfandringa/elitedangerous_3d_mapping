import json
import logging
import pandas as pd
import math
from pathlib import Path

SECTOR0_ORIGIN = {'x': -49985, 'y': -40985, 'z': -24105}


def get_mass_code(id64):
    return chr(int(id64[61:64], 2)+ord('a'))


def get_binary_string(id64):
    return bin(id64)[2:].zfill(64)


def get_sector_number_from_coords(coords):
    x = math.floor((coords['x']-SECTOR0_ORIGIN['x'])/1280)
    y = math.floor((coords['y']-SECTOR0_ORIGIN['y'])/1280)
    z = math.floor((coords['z']-SECTOR0_ORIGIN['z'])/1280)
    return (x, y, z)


def get_origin_from_sector_number(number):
    x = number[0]*1280+SECTOR0_ORIGIN['x']
    y = number[1]*1280+SECTOR0_ORIGIN['y']
    z = number[2]*1280+SECTOR0_ORIGIN['z']
    return {'x': x, 'y': y, 'z': z}


def extract_id64_sector(id64):
    # bitfield index numbers are reversed becase LSB vs MSB
    # source: http://disc.thargoid.space/ID64
    bitfields = {
        'h': {'z': (54, 61), 'y': (48, 54), 'x': (41, 48)},
        'g': {'z': (53, 60), 'y': (46, 52), 'x': (38, 45)},
        'f': {'z': (52, 59), 'y': (44, 50), 'x': (35, 42)},
        'e': {'z': (51, 58), 'y': (42, 48), 'x': (32, 39)},
        'd': {'z': (50, 57), 'y': (40, 46), 'x': (29, 36)},
        'c': {'z': (49, 56), 'y': (38, 44), 'x': (26, 33)},
        'b': {'z': (48, 55), 'y': (36, 42), 'x': (23, 30)},
        'a': {'z': (47, 54), 'y': (34, 40), 'x': (20, 27)}
    }

    id64b = get_binary_string(id64)
    mass_code = get_mass_code(id64b)

    # Get the x,y and z sector NUMBERS (not coordinates yet)
    x = int(id64b[bitfields[mass_code]['x'][0]                  :bitfields[mass_code]['x'][1]], 2)
    y = int(id64b[bitfields[mass_code]['y'][0]                  :bitfields[mass_code]['y'][1]], 2)
    z = int(id64b[bitfields[mass_code]['z'][0]                  :bitfields[mass_code]['z'][1]], 2)
    sector_number = (x, y, z)

    min = get_origin_from_sector_number(sector_number)

    max = {
        'x': min['x'] + 1280,
        'y': min['y'] + 1280,
        'z': min['z'] + 1280
    }

    center = {
        'x': min['x'] + 640,
        'y': min['y'] + 640,
        'z': min['z'] + 640
    }

    return {'sector_number': sector_number, 'min': min, 'max': max, 'center': center, 'mass_code': mass_code}


def check(coords, sector): return (
    coords['x'] >= sector['min']['x'] and coords['x'] < sector['max']['x']
    and coords['y'] >= sector['min']['y'] and coords['y'] < sector['max']['y']
    and coords['z'] >= sector['min']['z'] and coords['z'] < sector['max']['z'])


def check_id64_sectors():
    wregoe_ul_b_c27_20 = {"id": 27337, "id64": 5582283182826, "name": "Wregoe UL-B c27-20",
                          "coords": {"x": 533.75, "y": 117.875, "z": 122.4375}, "date": "2015-05-12 15:29:33"}
    colonia = {"id": 3384966, "id64": 3238296097059, "name": "Colonia", "coords": {
        "x": -9530.5, "y": -910.28125, "z": 19808.125}, "date": "2017-02-24 09:27:10"}
    system = wregoe_ul_b_c27_20
    sector = extract_id64_sector(system['id64'])

    print(f"Checking sector {system['name']}")
    print(f"Sector number: {sector['sector_number']}")
    print(f"Sector min: {sector['min']}")
    print(f"Sector max: {sector['max']}")
    print(f"Sector center: {sector['center']}")
    print(f"System coordinates: {system['coords']}")

    print(f"Correct? {check(system['coords'], sector)}")

    n = 100000
    sectors = {}
    print(f"Checking {n} sectors")
    with open('../systemsWithCoordinates.json', 'r') as f:
        f.readline()  # skip the first line because it just starts an array
        results = []

        # read the line but strip whitespace and the trailing comma
        line = f.readline().strip().rstrip(',')
        i = 0
        while line != ']' and i < n:

            # and turn into a dictionary
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])

            # if we don't know the sector, add it to the sectors dictionary
            if(sector['sector_number'] not in sectors.keys()):
                sectors[sector['sector_number']] = sector

            # Check if the system coordinates are within the sector
            correct = check(system['coords'], sector)
            if not correct:
                logging.error(
                    "System %s is not correct for sector %s", system, sector)
            results.append(correct)
            line = f.readline().strip().rstrip(',')
            i += 1

        print(f"All correct: {all(results)}")
        df = pd.DataFrame(sectors.values())
        df.index = df['sector_number']
        freqs = df['mass_code'].astype('category').value_counts()
        print(f"Mass code frequencies:\n{freqs}")


def get_sectors_from_systems():
    sectors = {}
    with open('../systemsWithCoordinates.json', 'r') as f:
        f.readline()  # skip the first line because it just starts an array

        # read the line but strip whitespace and the trailing comma
        line = f.readline().strip().rstrip(',')

        while line != ']':
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])

            # if we don't know the sector, add it to the sectors dictionary
            if(sector['sector_number'] not in sectors.keys()):
                sectors[sector['sector_number']] = sector
            line = f.readline().strip().rstrip(',')
    df = pd.DataFrame(sectors.values())
    del sectors
    df.index = df['sector_number']
    return df


def get_edastro_sectors():
    df = pd.read_csv('../sector-list.csv')
    df['sector_number'] = df.apply(
        lambda v: get_sector_number_from_coords({'x': v['Avg X'], 'y': v['Avg Y'], 'z': v['Avg Z']}), axis=1)
    df['min'] = df.apply(lambda v: get_origin_from_sector_number(
        v['sector_number']), axis=1)
    df['max'] = df['min'].apply(
        lambda v: {'x': v['x']+1280, 'y': v['y']+1280, 'z': v['z']+1280})
    df['center'] = df['min'].apply(
        lambda v: {'x': v['x']+640, 'y': v['y']+640, 'z': v['z']+640})
    df.index = df['sector_number']
    return df


def load_system_sectors():
    return pd.read_hdf('sectors_from_systems.h5', 'sectors')


def write_sectors_json():
    sectors = get_full_sectors_list()
    open('docs/sectors.json', 'w',
         encoding='utf-8').write(sectors.to_json(orient='index'))


def get_full_sectors_list():
    system_sectors = load_system_sectors()
    edastro_sectors = get_edastro_sectors()
    edastro_sectors_grouped = edastro_sectors.groupby(
        edastro_sectors['sector_number']).last()
    full_sectors = system_sectors.join(
        edastro_sectors_grouped, how='left', rsuffix='_edastro')
    full_sectors['sectorName'] = full_sectors.Sector
    return full_sectors[list(system_sectors.columns)+['sectorName']]


def get_file(sector_number):
    x, y, z = [str(i) for i in sector_number]
    dir = Path('docs', 'edsm', x, y, z)
    if not(dir.is_dir()):
        dir.mkdir(parents=True)
    fname = dir / f'{x}_{y}_{z}.json'
    f = fname.open('w', encoding='utf-8')
    f.write('[\n')
    f.close()
    return fname


def close_files(sector_files):
    for fname in sector_files.values:
        f = fname.open('a', encoding='utf-8')
        f.write(']')
        f.close()


def split_systems_with_coordinates_per_sector():
    """
    Take the EDSM systemsWithCoordinates.json file and split it into separate files per sector.
    The main file is very large (>1.8Gb) so only process 1 line at a time and write those out directly
    to save memory. This does mean some messing around with reading and writing json files.

    Both the original file and the sector files are assumed to be a json array with each system
    on a separate line and the 1st and last line containing the array delimiters.
    """
    sectors = get_full_sectors_list()
    sector_files = dict((k, get_file(k)) for k in sectors.index)
    with open('../systemsWithCoordinates.json', 'r') as f:
        f.readline()  # skip the first line because it just starts an array

        # read the line but strip whitespace and the trailing comma
        line = f.readline().strip().rstrip(',')

        while line != ']':
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])
            system['sector'] = sector['sector_number']
            sector_f = sector_files[sector['sector_number']].open(
                'a', encoding='utf-8')
            sector_f.write(f'\t{json.dumps(system)},\n')
            sector_f.close()
            line = f.readline().strip().rstrip(',')
    close_files(sector_files)
