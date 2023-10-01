# CfxDoc - My App Object Model

## Introduction

Easily turn your .NET XML comments into documentation. Dead simple to use. No need for utilities that use reflection and output static HTML files. Just drop the *.xml comment files that Visual Studio generates and you're good to go. Inspired by DocFx, but hopefully even simpler to use considering you have one web page here versus dozens of static HTML files.

## Benefits

1. Simple to configure.
2. Super-fast navigation. No page load blinks (it's a SPA application).
3. Fast search all properties, not just page titles.
4. Easy to publish.

## Configuration

The only required configuration takes place in the "config.js" file in the root of the project. It contains the paths to the XML comment files that will be loaded.

Other customizations can easily be made in the index.html. Common modifications, such as title and this page itself, are clearly marked.

## Publish

Just copy the project and XML comment files to your destination and you're done. The application is completely client-side and requires no special web server configuration.

The entire application consists of only the following files:

1. index.html The main page. Feel free to customize the sections that are marked as customizable.
2. favicon.ico The site icon. Feel free to change it.
3. config.js Required list of your xml comment files in /xmldocs (or elsewhere).
4. /xmldocs/* Your xml comment files (optional).
5. /styles/site.css Self-explanatory. Feel free to modify the site colors, etc.
6. /lib/cfxdoc.js The application logic. Do not modify.

## More Information

Learn more about XML comment documentation: [https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/xmldoc/)