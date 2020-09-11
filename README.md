# ED3D: Elite:Dangerous 3D Map
ED3D is a 3D map for Elite Dangerous. It draws from the awesome datasets already out there, and visualizes them in 3D. The current stable version is used for the Banana Nebula Expedition to map Notable Stellar Phenomena sites ardound the Banana Nebula Galaxy NGC3199. The map can be viewed on http://allican.be/elitedangerous_3d_mapping. 

Issues are tracked in on [Github](https://github.com/dolfandringa/elitedangerous_3d_mapping/issues).

Currently a rework is in progress turning it into a proper React app. This version will also include EDSM data and gradually add more sources like Neutron stars and other interesting information published by EDAstro and others. Development for that is going on in the [develop branch](https://github.com/dolfandringa/elitedangerous_3d_mapping/tree/develop).


## Data sources
- Main datasource: ['SystemsWithCoordinates.json' file from edsm.net](https://www.edsm.net/en/nightly-dumps).
- Neutron stars: [Neutron Stars (Raw List)](https://edastro.com/mapcharts/files/neutron-stars.csv) from [ED Astrometrics spreadsheets page](https://edastro.com/mapcharts/files.html)

## How to use
Just visit http://allican.be/elitedangerous_3d_mapping. This is a static website, actually hosted on github pages. The files are in the [docs folder of the master branch](https://github.com/dolfandringa/elitedangerous_3d_mapping/tree/master/docs).

Scripts to generate the data are written in python3. Check the develop branch for them in the `scripts` folder. There is also a `requirements.txt` which contains the python dependencies.

## Data
In `docs/edsm` there are currently smaller dump of the EDSM data split up by 1280x1280x1280LY sectors to reduce the size per file. These are json files with lists of systems. The sector numbers are [derived from the id64](http://disc.thargoid.space/ID64) and sector 0,0,0 starts at `{'x': -49985, 'y': -40985, 'z': -24105}` and then just keeps moving up 1280LY at a time. The bubble is around 39,32,19.

For the banana nebula and other data I generate h5 (hdf) files with the data that you are welcome to use. For the banana nebula also a csv is created for those interested.