"""
Get sectors from the id64 and split systemsWithCoordinates into separate
files per sector.
"""
import gzip
import json
import logging
import math
import multiprocessing as mp
from datetime import datetime
from pathlib import Path

import pandas as pd
from tqdm import tqdm

SECTOR0_ORIGIN = {'x': -49985, 'y': -40985, 'z': -24105}


def get_mass_code(id64):
    """Get the mass code from the id64"""

    return chr(int(id64[61:64], 2)+ord('a'))


def get_binary_string(id64):
    """
    Turn the numberic id64 into a binary string of 64 characters without the
    leader 0b.
    """

    return bin(id64)[2:].zfill(64)


def get_sector_number_from_coords(coords):
    """Get the sector number from the coordinates."""
    x = math.floor((coords['x']-SECTOR0_ORIGIN['x'])/1280)
    y = math.floor((coords['y']-SECTOR0_ORIGIN['y'])/1280)
    z = math.floor((coords['z']-SECTOR0_ORIGIN['z'])/1280)

    return (x, y, z)


def get_origin_from_sector_number(number):
    """Get the coordinates of the sector origin from the number."""
    x = number[0]*1280+SECTOR0_ORIGIN['x']
    y = number[1]*1280+SECTOR0_ORIGIN['y']
    z = number[2]*1280+SECTOR0_ORIGIN['z']

    return {'x': x, 'y': y, 'z': z}


def get_sector_from_number(sector_number):
    """Get the full sector definition from the sector number."""
    cmin = get_origin_from_sector_number(sector_number)

    cmax = {
        'x': cmin['x'] + 1280,
        'y': cmin['y'] + 1280,
        'z': cmin['z'] + 1280
    }

    center = {
        'x': cmin['x'] + 640,
        'y': cmin['y'] + 640,
        'z': cmin['z'] + 640
    }

    return {'sector_number': sector_number, 'min': cmin, 'max': cmax,
            'center': center}


def extract_id64_sector(id64):
    """
    Extract the sector from the ID64
    bitfield index numbers are reversed becase LSB vs MSB
    source: http://disc.thargoid.space/ID64
    """
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
    x = int(id64b[bitfields[mass_code]['x'][0]:
                  bitfields[mass_code]['x'][1]], 2)
    y = int(id64b[bitfields[mass_code]['y'][0]:
                  bitfields[mass_code]['y'][1]], 2)
    z = int(id64b[bitfields[mass_code]['z'][0]:
                  bitfields[mass_code]['z'][1]], 2)
    sector_number = (x, y, z)

    return get_sector_from_number(sector_number)


def check(coords, sector):
    """Are coords inside sector"""

    return (
        coords['x'] >= sector['min']['x']
        and coords['x'] < sector['max']['x']
        and coords['y'] >= sector['min']['y']
        and coords['y'] < sector['max']['y']
        and coords['z'] >= sector['min']['z']
        and coords['z'] < sector['max']['z'])


def check_id64_sectors():
    """Check a bunch of sectors derived from the id64 for correctness."""
    wregoe_ul_b_c27_20 = {"id": 27337, "id64": 5582283182826,
                          "name": "Wregoe UL-B c27-20",
                          "coords": {"x": 533.75, "y": 117.875, "z": 122.4375},
                          "date": "2015-05-12 15:29:33"}
    colonia = {"id": 3384966, "id64": 3238296097059, "name": "Colonia",
               "coords": {"x": -9530.5, "y": -910.28125, "z": 19808.125},
               "date": "2017-02-24 09:27:10"}
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

            if sector['sector_number'] not in sectors.keys():
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
    """Get the sectors from systemsWithCoordinates.json.gz file."""
    sectors = {}
    with gzip.open('../systemsWithCoordinates.json.gz',
                   'rt', encoding='utf-8') as f:
        f.readline()  # skip the first line because it just starts an array

        # read the line but strip whitespace and the trailing comma
        line = f.readline().strip().rstrip(',')

        while line != ']':
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])

            # if we don't know the sector, add it to the sectors dictionary

            if sector['sector_number'] not in sectors.keys():
                sectors[sector['sector_number']] = sector
            line = f.readline().strip().rstrip(',')
    df = pd.DataFrame(sectors.values())
    del sectors
    df.index = df['sector_number']

    return df


def get_edastro_sectors():
    """Load the EDAstro sectors from their CSV file."""
    df = pd.read_csv('../sector-list.csv')
    df['sector_number'] = df.apply(
        lambda v: get_sector_number_from_coords({'x': v['Avg X'],
                                                 'y': v['Avg Y'],
                                                 'z': v['Avg Z']}), axis=1)
    df['min'] = df.apply(lambda v: get_origin_from_sector_number(
        v['sector_number']), axis=1)
    df['max'] = df['min'].apply(
        lambda v: {'x': v['x']+1280, 'y': v['y']+1280, 'z': v['z']+1280})
    df['center'] = df['min'].apply(
        lambda v: {'x': v['x']+640, 'y': v['y']+640, 'z': v['z']+640})
    df.index = df['sector_number']

    return df


def load_system_sectors():
    """Load a sectors df from the hdf5 file."""

    return pd.read_hdf('sectors_from_systems.h5', 'sectors')


def write_sectors_json(sectors=None):
    """Write a json file of the sectors from the dataframe."""

    if sectors is None:
        sectors = get_full_sectors_list()
    open('docs/sectors.json', 'w',
         encoding='utf-8').write(sectors.to_json(orient='records'))


def get_full_sectors_list(system_sectors=load_system_sectors()):
    """Add names from edastro sectors to the sectors dataframe."""
    edastro_sectors = get_edastro_sectors()
    edastro_sectors_grouped = edastro_sectors.groupby(
        edastro_sectors['sector_number']).last()
    full_sectors = system_sectors.join(
        edastro_sectors_grouped, how='left', rsuffix='_edastro')
    full_sectors['sectorName'] = full_sectors.Sector.fillna('Unkown')
    columns = list(system_sectors.columns)

    if 'sectorName' not in columns:
        columns.append('sectorName')

    return full_sectors[columns]


def create_sector_file(sector_number):
    """Create a sector json file for adding systems later."""
    # start without gzip compression but use it for the filename anyway
    # compression will be done in close_files
    fname = get_sector_file(sector_number)
    f = open(fname, 'w', encoding='utf-8')
    f.write('[\n')
    f.close()

    return fname


def get_sector_file(sector_number, target_dir=Path.home()):
    """Get the sector filename from the sector number."""
    # start without gzip compression but use it for the filename anyway
    # compression will be done in close_files
    x, y, z = [str(i) for i in sector_number]
    fdir = target_dir/Path('edsm', x, y)

    if not fdir.is_dir():
        fdir.mkdir(parents=True)
    fname = fdir / Path(f'{x}_{y}_{z}.json.gz')

    return fname


def close_files(sector_files):
    """Rewrite each file to add training json ]"""

    for fname in sector_files.values():
        with open(fname, 'r', encoding='utf-8') as f:
            s = f.read().rstrip().rstrip(',')  # remove last trailing comma
        s += '\n]'  # close json array
        with gzip.open(fname, 'wt', encoding='utf-8', compresslevel=9) as f:
            # compress file
            f.write(s)


def split_systems_with_coordinates_per_sector():
    """
    Take the EDSM systemsWithCoordinates.json file and split it into separate
    files per sector. The main file is very large (>1.8Gb) so only process 1
    line at a time and write those out directly to save memory.
    This does mean some messing around with reading and writing json files.

    Both the original file and the sector files are assumed to be a json array
    with each system on a separate line and the 1st and last line containing
    the array delimiters.
    """
    sectors = get_full_sectors_list()
    sector_files = dict((k, create_sector_file(k)) for k in sectors.index)
    read = 0
    with gzip.open('../systemsWithCoordinates.json.gz', mode='rt',
                   encoding='utf-8') as f:

        for i, line in enumerate(f):
            if i % 50000 == 0:
                print(f"{datetime.now()}:{i/50000} {round(read/1024**2,2)}MB")
            line = line.strip().strip(',')

            if line in ['[', ']']:
                continue
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])
            system['sector'] = sector['sector_number']

            # Unfortunately we need to rewrite the whole file because gzip
            # compresses very badly when appending
            out_line = f'\t{json.dumps(system)},\n'
            read += len(out_line)
            with open(sector_files[sector['sector_number']], 'a',
                      encoding='utf-8') as f:
                f.write(out_line)

    close_files(sector_files)


def write_changed_sectors(sector_number, systems, target_dir):
    """Write changed sectors to the correct file."""
    j, k = (0, 0)
    new = False
    sector_file = get_sector_file(sector_number, target_dir)
    try:
        json_data = gzip.open(sector_file, mode='rt',
                              encoding='utf-8').read()
    except FileNotFoundError:
        new = True
        json_data = '[]'

    try:
        sector_data = json.loads(json_data)
    except json.JSONDecodeError:
        # original files had a trailing comma behind the last array item
        # which causes a JSONDecodeError. So remove that comma.
        try:
            sector_data = json.loads(
                json_data.rstrip().rstrip(']').rstrip().rstrip(',')+'\n]')
        except Exception:
            logging.error("Error processing sector %s with data %s",
                          sector_number, json_data)
            raise

    for s in sector_data:
        # Update existing systems

        if s['id'] in systems.keys():
            s.update(systems[s['id']])
            del systems[s['id']]
            j += 1

    for system in systems.values():
        # Add new systems
        sector_data.append(system)
        k += 1
    with gzip.open(sector_file, 'wt', encoding='utf-8',
                   compresslevel=9) as f:
        f.write(json.dumps(sector_data))

    return (sector_number, new, j, k)


def update_system_sector_files(
        target_dir=Path.home(),
        source_file='../systemsWithCoordinates7days.json.gz'):
    """Update existing system sector files."""
    changed_sectors = {}
    with gzip.open(source_file, mode='rt', encoding='utf-8') as f:
        for line in f:
            line = line.strip().strip(',')

            if line in ['[', ']']:
                continue
            system = json.loads(line)
            sector = extract_id64_sector(system['id64'])
            system['sector'] = sector['sector_number']
            changed_sectors.setdefault(
                sector['sector_number'], {})[system['id']] = system
    num_changed = sum([len(v.keys()) for v in changed_sectors.values()])

    pool = mp.Pool()
    results = []

    pbar = tqdm(total=num_changed, unit="systems")

    for sector_number, systems in changed_sectors.items():
        result = pool.apply_async(write_changed_sectors,
                                  args=(sector_number, systems, target_dir),
                                  callback=lambda x: pbar.update(x[2]+x[3]))
        results.append(result)
    new_sectors = []

    updated = 0
    added = 0

    for result in results:
        result.wait()
        res = result.get()
        updated += res[2]
        added += res[3]

        if res[1]:
            new_sectors.append(res[0])
    pbar.close()
    print(f"Added {added} systems and updated {updated} systems. "
          f"Found {len(new_sectors)} new sectors.")

    new_sector_list = []

    for sector_number in new_sectors:
        sector = get_sector_from_number(sector_number)
        new_sector_list.append(sector)

    if len(new_sector_list) > 0:
        new_sector_df = pd.DataFrame(new_sector_list)
        new_sector_df.index = new_sector_df['sector_number']
        new_sector_df = get_full_sectors_list(new_sector_df)
        full_sector_list = pd.concat([get_full_sectors_list(), new_sector_df])
        full_sector_list.to_hdf('sectors_from_updated_systems.h5', 'sectors')
