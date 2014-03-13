generic
=======



Generic mods go here, e.g. 3D models that can fit in any mod.
All mod files we work on but don't know where to put currently go here.



#1 Usage
If you wish to use a mod in a mod pack simply specify an import tag in your mods xml file. This may be the mod pack global one or the one that goes with each mod.

<import>
    <mod>
        <url></url><!-- if this is specified then this mod be tried to resolve by the mod manager in the engine. -->
        <path></path><!-- otherwise this will be used as the mod to be imported. May also point relatively to another mod in the 0A.D./pyrogenesis file hierarchy. e.g. mods/public/art/... -->
      
    </mod>
</import>

If the URL is given and can be resolved to a valid mod, then the directory may:
 * either specify the path that leads to an existing file, then this is used as a fallback if the online mod can't be resolved or gives trouble.
 * or specify to a path that is not given or is a directory.
 ** If it's a directory, then this path is where the downloaded mod will be put into. This way a mod can control the position of mods it depends upon. To be discussed if that is desired.
 ** If it's a non-existing file, then if the file is within the folder where the downloaded mod says it resides in usually and the ending of both is the same, then the mod will simply be renamed to the filename specified in the path tag.


In JSON format this will look like:

HybridAI
import: { { url: , path: }, /*another mod object*/, ... },
url: "http://server/0ADCoM/repository/<modpack>/path/to/mod",
depends: /*modfolder*/"public/simulation/ai/common-api/",



