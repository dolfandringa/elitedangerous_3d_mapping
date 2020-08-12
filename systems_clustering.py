from sklearn.cluster import DBSCAN
import numpy as np
import matplotlib.pyplot as plt
import pandas as pd
import open3d as o3d
import logging
logging.basicConfig(format='%(asctime)s-%(name)s-%(message)s', datefmt='%Y-%m-%d %H:%M:%S')
logging.getLogger('clustering').setLevel(logging.DEBUG)

from load_systems import load_barnards_area, BARNARDS_BB

log = logging.getLogger('clustering.systems_clustering')

log.debug("Reading data")

systems = load_barnards_area()
log.debug("Clustering...")
clusters = DBSCAN(eps=56, min_samples=120).fit(systems[['x','y','z']])
labels = list(set(clusters.labels_))
clustered_systems = systems.copy()
clustered_systems['cluster'] = clusters.labels_
log.debug(f"Number of systems {len(systems)}")
log.debug(f"Number of clusters: {len(labels)}")
log.debug("Creating pointcloud")
colors = [plt.cm.Spectral(each) for each in np.linspace(0, 1, len(labels))]
colors = pd.DataFrame({'cluster': labels,
                       'r': [c[0] for c in colors], 'g': [c[1] for c in colors], 'b': [c[2] for c in colors]})
log.debug(len(colors))
colors.drop(index=colors[colors['cluster']==-1].index, inplace=True)
clustered_systems = clustered_systems.join(colors.set_index('cluster'), on='cluster', how='left')
data=clustered_systems[clustered_systems.cluster >= 0]
pcd = o3d.geometry.PointCloud()
pcd.points = o3d.utility.Vector3dVector(data[['x','y','z']].to_numpy())
pcd.colors = o3d.utility.Vector3dVector(data[['r','g','b']].to_numpy())
bb_pcd = o3d.geometry.PointCloud()
bb_pcd.points = o3d.utility.Vector3dVector(BARNARDS_BB)
aabb = bb_pcd.get_axis_aligned_bounding_box()
aabb.color = (1,0,0)

log.debug("Writing to file")
o3d.io.write_point_cloud('barnards_clusters.ply', pcd)
log.debug("Showing clusters")
o3d.visualization.draw_geometries([pcd, aabb])
