import pandas as pd
import logging

log = logging.getLogger('clustering.load_systems')

import open3d as o3d
BARNARDS_BB = [(-6000,-1000,-8000),(3500,1000,-1000)]
BARNARDS_AREA = None

def get_systems_by_coordinates(min, max):
    log.debug(f"Reading data for bounding box {min}, {max}")
    return pd.read_hdf('systems.h5', '/table', where="x>min[0] & x<max[0] & y>min[1] &  y<max[1] & z>min[2] & z<max[2]")

def get_system_by_name(name):
    log.debug(f"Reading data for system {name}")
    return pd.read_hdf('systems.h5', '/table', where="system_name=name")
    
    
def load_barnards_area():
    global BARNARDS_AREA
    if BARNARDS_AREA is None :
        BARNARDS_AREA = get_systems_by_coordinates(BARNARDS_BB[0], BARNARDS_BB[1])
    return BARNARDS_AREA