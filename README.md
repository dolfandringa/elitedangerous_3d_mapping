# Elite:Dangerous 3D mapping
This repository contains my attempts to do 3D visualisations of the Elite:Dangerous galaxy map. There are many awesome community-built resources out there with a lot of useful data, but many of them only provide 2D visualisations. The Galaxy map in-game is easy to navigate but provides little functionality. I am trying to combine the 3D ease of navigation with the cool data gathered/compiled by others. 

For now these are my main goals:
- Make a 3D representation similar to the heatmap created by ED Astrometrics
- Visualise the large permit locked systems in 3D
- Provide a quick way to find known neutron stars closest to a specific system

## Data sources
- Main datasource: ['SystemsWithCoordinates.json' file from edsm.net](https://www.edsm.net/en/nightly-dumps).
- Neutron stars: [Neutron Stars (Raw List)](https://edastro.com/mapcharts/files/neutron-stars.csv) from [ED Astrometrics spreadsheets page](https://edastro.com/mapcharts/files.html)

## How to use
The scripts are python scripts. This is not meant to be a simple application to use, but for now is just a collection of scripts that can be run by somebody who is somewhat comfortable with python. Maybe I'll publish a nice tool at some point, but don't hold your breath. If you wanna help, that's awesome.

You need to `pip3 install pandas tables numpy sklearn open3d matplotlib` to install all dependencies. Then you can run the scripts. I run them in IPython with for instance `%run systems_clustering.py`. You need the `systemsWithCoordinates.json` file from EDSM. You can then run the `get_systems.py` script to create an HDF5 table from that, and use `systems_clustering.py`to generate the clusters.

If you just want to see the 3D result, you can download the `.ply` file and visualize it with any tool that supports it. In python you can do it with the `show_clusters.py` script which just does the following:

```
import open3d as o3d
pcd = o3d.io.read_point_cloud("clusters.ply")
o3d.visualization.draw_geometries([pcd])
```
