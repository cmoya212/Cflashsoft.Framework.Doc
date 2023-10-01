///<reference path="jquery/dist/jquery.js" />
// CfxDoc Code Library Documentation
// Written by Carlos Moya 
var cfxDoc = {
    currentUrl: "",
    namespaces: [],
    init: function () {
        $("#Title").text(cfxDocConfig.title);
        cfxDoc.currentUrl = new URL(window.location);
        window.addEventListener("hashchange", cfxDoc.window_hashchange);
        var xmlDocs = [];
        for (var index = 0; index < cfxDocConfig.xmlDocs.length; index++) {
            $.ajax({
                type: "GET",
                url: cfxDocConfig.xmlDocs[index],
                dataType: "xml",
                cache: false,
                success: function (xml) {
                    xmlDocs.push(xml);
                    if (xmlDocs.length == cfxDocConfig.xmlDocs.length)
                        cfxDoc.loadComplete(xmlDocs);
                },
                error: function (xhr, ajaxOptions, thrownError) {
                    $("#LoadErrorBox").show();
                    $("#LoadErrorMessage").text(thrownError);
                }
            });
        }
    },
    tocCaret_click: function () {
        this.parentElement.querySelector(".toc_nested").classList.toggle("toc_active");
        this.classList.toggle("toc_caret-down");
    },
    tocLink_click: function () {
        cfxDoc.renderBody($(this).attr("cfxdoc-link-id"));
    },
    tocSearchBox_change() {
        cfxDoc.startDelayedSearch();
    },
    tocSearchBox_focus() {
        $("#TocSearchBox").trigger("select");
        var str = $("#TocSearchBox").val();
        if (str.length >= 3) {
            $("#TableOfContents").hide();
            $("#SearchResults").show();
        }
    },
    window_hashchange: function () {
        var hash = window.location.hash;
        if (hash != null && hash != "")
            cfxDoc.jumpToItem(hash.replace("#", "").replace(/\./g, ","));
    },
    searchResultLink_click: function () {
        cfxDoc.jumpToItem($(this).attr("cfxdoc-link-id"));
        $("#SearchResults").hide();
        $("#TableOfContents").show();
    },
    searchTimeout: null,
    startDelayedSearch: function () {
        if (cfxDoc.searchTimeout != null) {
            clearTimeout(cfxDoc.searchTimeout);
            cfxDoc.searchTimeout = null;
        }
        var str = $("#TocSearchBox").val();
        if (str.length >= 3)
            cfxDoc.searchTimeout = setTimeout(function () { cfxDoc.startSearch(); }, 1000);
        else
            if ($("#SearchResults").is(":visible")) {
                $("#SearchResults").empty().hide();
                $("#TableOfContents").show();
                cfxDoc.searchResultItemCounter = 0;
            }
    },
    startSearch: function () {
        $("#SearchResults").empty();
        cfxDoc.searchResultItemCounter = 0;
        var str = $("#TocSearchBox").val().toLowerCase();
        $("#TocSearchBox").hide();
        $("#TocSearchStatus").show();
        $("#TableOfContents").hide();
        $("#SearchResults").show();
        var foundItems = [];
        for (var index = 0; index < cfxDoc.namespaces.length; index++) {
            var namespace = cfxDoc.namespaces[index];
            if (namespace.name.toLowerCase().indexOf(str) > -1)
                foundItems.push({ label: namespace.name + " Namespace", linkData: index.toString() });
            for (var index2 = 0; index2 < namespace.types.length; index2++) {
                var type = namespace.types[index2];
                if (type.memberName.toLowerCase().indexOf(str) > -1)
                    foundItems.push({ label: type.memberName + " Class", linkData: index.toString() + "," + index2.toString() });
                for (var index3 = 0; index3 < type.fields.length; index3++) {
                    var item = type.fields[index3];
                    if (item.memberName.toLowerCase().indexOf(str) > -1)
                        foundItems.push({ label: item.memberName + " Field", linkData: index.toString() + "," + index2.toString() + ",F" + index3.toString() });
                }
                for (var index3 = 0; index3 < type.properties.length; index3++) {
                    var item = type.properties[index3];
                    if (item.memberName.toLowerCase().indexOf(str) > -1)
                        foundItems.push({ label: item.memberName + " Property", linkData: index.toString() + "," + index2.toString() + ",P" + index3.toString() });
                }
                for (var index3 = 0; index3 < type.methods.length; index3++) {
                    var item = type.methods[index3];
                    if (item.memberName.toLowerCase().indexOf(str) > -1)
                        foundItems.push({ label: item.memberName + " Method", linkData: index.toString() + "," + index2.toString() + ",M" + index3.toString() });
                }
            }
        }
        if (foundItems.length > 0) {
            for (var index = 0; index < foundItems.length; index++) {
                var item = foundItems[index];
                cfxDoc.createSearchResultLinkItem(item.label, $("#SearchResults"), $("#TocLinkTemplate"), item.linkData);
            }
        }
        $("#TocSearchStatus").hide();
        $("#TocSearchBox").show();
    },
    loadComplete: function (xmlDocs) {
        var progressBox = $("#InitializingProgress");
        for (var index = 0; index < xmlDocs.length; index++) {
            var progress = (((index + 1) / (xmlDocs.length - 1)) * 100);
            //progressBox.text(progress + "%");
            //var xmlDocBla = xmlDocs[index];
            var xmlDoc = $(xmlDocs[index]);
            var assembly = cfxDoc.cleanText(xmlDoc.children("doc:first").children("assembly:first").children("name:first").text());
            var assemblyNoted = false;
            var members = xmlDoc.children("doc:first").children("members:first");
            members.children("[name^='T:']").each(function () {
                var typeData = cfxDoc.getMemberData($(this), assembly);
                typeData.constructors = [];
                typeData.fields = [];
                typeData.properties = [];
                typeData.methods = [];
                members.children("[name^='F:" + typeData.fullName + ".']").each(function () {
                    typeData.fields.push(cfxDoc.getMemberData($(this), assembly));
                });
                members.children("[name^='P:" + typeData.fullName + ".']").each(function () {
                    typeData.properties.push(cfxDoc.getMemberData($(this), assembly));
                });
                members.children("[name^='M:" + typeData.fullName + ".']").each(function () {
                    var memberData = cfxDoc.getMemberData($(this), assembly);
                    if (memberData.memberName.startsWith("#ctor"))
                        typeData.constructors.push(memberData);
                    else
                        typeData.methods.push(memberData);
                });
                var namespace = cfxDoc.namespaces.find(function (e) {
                    return e.name == typeData.namespace;
                });
                if (namespace == null) {
                    namespace = {
                        name: typeData.namespace,
                        namespace: typeData.namespace,
                        assembly: assembly,
                        types: []
                    };
                    cfxDoc.namespaces.push(namespace);
                    assemblyNoted = true
                }
                else {
                    if (!assemblyNoted) {
                        namespace.assembly = namespace.assembly + ", " + assembly;
                        assemblyNoted = true
                    }
                }
                typeData.constructors.sort(function (a, b) { return a.memberName.localeCompare(b.memberName); });
                typeData.fields.sort(function (a, b) { return a.memberName.localeCompare(b.memberName); });
                typeData.properties.sort(function (a, b) { return a.memberName.localeCompare(b.memberName); });
                typeData.methods.sort(function (a, b) { return a.memberName.localeCompare(b.memberName); });
                namespace.types.push(typeData);
            });
        }
        cfxDoc.namespaces.sort(function (a, b) { return a.name.localeCompare(b.name); });
        cfxDoc.renderToc();
        $("#TocSearchBox").on("input", cfxDoc.tocSearchBox_change);
        $("#TocSearchBox").on("focus", cfxDoc.tocSearchBox_focus);
        $("#InitializingBox").hide();
        $("#ContentBox").show();
    },
    getMemberData: function (member, assembly) {
        var name = member.attr("name");
        var memberTypeSplitIndex = name.indexOf(":");
        var memberType = name.substring(0, memberTypeSplitIndex);
        var fullName = name.substring(memberTypeSplitIndex + 1);
        var nameSplitIndex = fullName.lastIndexOf(".#ctor");
        if (nameSplitIndex == -1) {
            nameSplitIndex = fullName.indexOf("(");
            if (nameSplitIndex > -1)
                nameSplitIndex = fullName.lastIndexOf(".", nameSplitIndex);
        }
        if (nameSplitIndex == -1)
            nameSplitIndex = fullName.lastIndexOf(".");
        var namespace = fullName.substring(0, nameSplitIndex);
        var memberName = fullName.substring(nameSplitIndex + 1);
        var memberNameWithoutParameters = memberName;
        var memberParameters = "";
        var memberNameSplit = memberName.indexOf("(");
        if (memberNameSplit > -1) {
            memberNameWithoutParameters = memberName.substring(0, memberNameSplit);
            memberParameters = memberName.substring(memberNameSplit);
        }
        var summary = cfxDoc.cleanText(member.children("summary:first").text());
        var returns = cfxDoc.cleanText(member.children("returns:first").text());
        var example = cfxDoc.cleanText(member.children("example:first").text());
        var remarks = cfxDoc.cleanText(member.children("remarks:first").text());
        var params = [];
        member.children("param").each(function () {
            var item = $(this);
            params.push({ name: item.attr("name"), description: cfxDoc.cleanText(item.text()) });
        });
        return {
            assembly: assembly,
            name: name,
            memberType: memberType,
            fullName: fullName,
            namespace: namespace,
            memberName: memberName,
            memberNameWithoutParameters: memberNameWithoutParameters,
            memberParameters: memberParameters,
            summary: summary,
            returns: returns,
            example: example,
            remarks: remarks,
            params: params
        }
    },
    cleanText: function (text) {
        if (text == null)
            return "";
        else
            return text.replace(/\\n/g, "").trim()
    },
    tocCaretItemCounter: 0,
    tocLinkItemCounter: 0,
    searchResultItemCounter: 0,
    createTocCaretItem: function (label, parent, tocCaretTemplate) {
        cfxDoc.tocCaretItemCounter++;
        var caretElement = tocCaretTemplate.clone();
        caretElement.attr("id", "TocNestedItem" + cfxDoc.tocCaretItemCounter);
        var caret = caretElement.find(".toc_caret:first");
        caret.text(label);
        caret.attr("title", label);
        caret[0].addEventListener("click", cfxDoc.tocCaret_click);
        caretElement.appendTo(parent);
        return { caretElement: caretElement, contents: caretElement.find("ul:first") }
    },
    createTocLinkItem: function (label, parent, tocLinkTemplate, linkData) {
        cfxDoc.tocLinkItemCounter++;
        var linkElement = tocLinkTemplate.clone();
        linkElement.attr("id", "TocLink" + cfxDoc.tocLinkItemCounter);
        var contents = linkElement.find(".toc_link:first");
        contents.text(label);
        contents.attr("title", label)
        contents.attr("cfxdoc-link-id", linkData);
        contents[0].addEventListener("click", cfxDoc.tocLink_click);
        linkElement.appendTo(parent);
        return { linkElement: linkElement, contents: contents };
    },
    createSearchResultLinkItem: function (label, parent, tocLinkTemplate, linkData) {
        cfxDoc.searchResultItemCounter++;
        var linkElement = tocLinkTemplate.clone();
        linkElement.attr("id", "SearchResultLink" + cfxDoc.searchResultItemCounter);
        var contents = linkElement.find(".toc_link:first");
        contents.text(label);
        contents.attr("title", label)
        contents.attr("cfxdoc-link-id", linkData);
        contents[0].addEventListener("click", cfxDoc.searchResultLink_click);
        linkElement.appendTo(parent);
        return { linkElement: linkElement, contents: contents };
    },
    renderToc: function () {
        var toc = $("#TableOfContents");
        var tocCaretTemplate = $("#TocNestedItemTemplate");
        var tocLinkTemplate = $("#TocLinkTemplate");
        for (var index = 0; index < cfxDoc.namespaces.length; index++) {
            var namespace = cfxDoc.namespaces[index];
            var namespaceElement = cfxDoc.createTocCaretItem(namespace.name, toc, tocCaretTemplate);
            cfxDoc.createTocLinkItem(namespace.name, namespaceElement.contents, tocLinkTemplate, index.toString())
            for (var index2 = 0; index2 < namespace.types.length; index2++) {
                var type = namespace.types[index2];
                var typeElement = cfxDoc.createTocCaretItem(type.memberName, namespaceElement.contents, tocCaretTemplate);
                cfxDoc.createTocLinkItem(type.memberName, typeElement.contents, tocLinkTemplate, index + "," + index2);
                if (type.constructors.length > 0)
                    cfxDoc.renderTocItems(typeElement, "Constructors", type.constructors, tocCaretTemplate, tocLinkTemplate, index + "," + index2 + ",C");
                if (type.fields.length > 0)
                    cfxDoc.renderTocItems(typeElement, "Fields", type.fields, tocCaretTemplate, tocLinkTemplate, index + "," + index2 + ",F");
                if (type.properties.length > 0)
                    cfxDoc.renderTocItems(typeElement, "Properties", type.properties, tocCaretTemplate, tocLinkTemplate, index + "," + index2 + ",P");
                if (type.methods.length > 0)
                    cfxDoc.renderTocItems(typeElement, "Methods", type.methods, tocCaretTemplate, tocLinkTemplate, index + "," + index2 + ",M");
            }
        }
    },
    renderTocItems: function (parent, label, items, tocCaretTemplate, tocLinkTemplate, initialLinkData) {
        var labelElement = cfxDoc.createTocCaretItem(label, parent.contents, tocCaretTemplate);
        for (var index = 0; index < items.length; index++) {
            var item = items[index];
            cfxDoc.createTocLinkItem(item.memberName, labelElement.contents, tocLinkTemplate, initialLinkData + index)
        }
    },
    showContentBox: function () {
        $("#ContentWelcomeTitleBox").hide();
        $("#ContentWelcomeBodyBox").hide();
        $("#ContentTitleBox").show();
        $("#ContentBodyBox").show();
    },
    hideContentBox: function () {
        $("#ContentTitleBox").hide();
        $("#ContentBodyBox").hide();
        $("#ContentWelcomeTitleBox").show();
        $("#ContentWelcomeBodyBox").show();
    },
    renderBody: function (linkData) {
        //cfxDoc.currentUrl.searchParams.set("topic", linkData);
        //history.pushState({}, "", cfxDoc.currentUrl);
        cfxDoc.currentUrl.hash = linkData.replace(/,/g, ".");
        history.pushState({}, "", cfxDoc.currentUrl.hash);
        cfxDoc.hideContentBox();
        cfxDoc.clearBody();
        var data = null;
        var name = ""
        var linkDataSplit = linkData.split(",")
        if (linkDataSplit.length > 0) {
            if (linkDataSplit.length == 1) {
                data = cfxDoc.namespaces[parseInt(linkDataSplit[0])];
                name = data.name + " Namespace";
            }
            else if (linkDataSplit.length == 2) {
                data = cfxDoc.namespaces[parseInt(linkDataSplit[0])].types[parseInt(linkDataSplit[1])];
                name = data.memberName + " Class";
            }
            else if (linkDataSplit.length == 3) {
                var memberType = linkDataSplit[2].substring(0, 1);
                var memberId = linkDataSplit[2].substring(1);
                switch (memberType) {
                    case "C":
                        data = cfxDoc.namespaces[parseInt(linkDataSplit[0])].types[parseInt(linkDataSplit[1])].constructors[parseInt(memberId)];
                        name = data.memberNameWithoutParameters + " Constructor";
                        break;
                    case "F":
                        data = cfxDoc.namespaces[parseInt(linkDataSplit[0])].types[parseInt(linkDataSplit[1])].fields[parseInt(memberId)];
                        name = data.memberNameWithoutParameters + " Field";
                        break;
                    case "P":
                        data = cfxDoc.namespaces[parseInt(linkDataSplit[0])].types[parseInt(linkDataSplit[1])].properties[parseInt(memberId)];
                        name = data.memberNameWithoutParameters + " Property";
                        break;
                    case "M":
                        data = cfxDoc.namespaces[parseInt(linkDataSplit[0])].types[parseInt(linkDataSplit[1])].methods[parseInt(memberId)];
                        name = data.memberNameWithoutParameters + " Method";
                        break;
                }
            }
        }
        if (data != null) {
            $("#TitleText").text(name);
            if (data.memberParameters)
                $("#TitleText2").text(data.memberParameters.replace(/,/g, ", "));
            if (data.namespace)
                $("#NamespaceText").text(data.namespace);
            if (data.assembly)
                $("#AssemblyText").text(data.assembly);
            if (data.summary)
                $("#SummaryText").text(data.summary);
            if (data.params) {
                for (var index = 0; index < data.params.length; index++) {
                    var param = data.params[index];
                    $("<li></li>").html("<b>" + param.name + "</b><br />" + param.description).appendTo($("#ParametersText"));
                }
            }
            if (data.returns)
                $("#ReturnsText").text(data.returns);
            if (data.example) {
                $("#ExampleText").html(data.example.replace(/\r\n/g, "<br />").replace(/\n/g, "<br />"));
            }                
            if (data.remarks)
                $("#RemarksText").text(data.remarks);
            cfxDoc.showContentBox();
        }
    },
    clearBody: function () {
        $("#TitleText").text("");
        $("#TitleText2").text("");
        $("#NamespaceText").text("");
        $("#AssemblyText").text("");
        $("#SummaryText").text("");
        $("#ParametersText").empty();
        $("#ReturnsText").text("");
        $("#ExampleText").text("");
        $("#RemarksText").text("");
    },
    jumpToItem: function (linkData) {
        var foundElement = $("[cfxdoc-item='TocLinkLabel'][cfxdoc-link-id='" + linkData + "']:first");
        if (foundElement.length > 0) {
            var parents = foundElement.parents("[cfxdoc-item='TocNestedItem']");
            parents.find("[cfxdoc-item='TocNestedItemCaret']:first").addClass("toc_caret-down");
            parents.find("[cfxdoc-item='TocNestedItemContents']:first").addClass("toc_active");
            foundElement[0].scrollIntoView();
            cfxDoc.renderBody(linkData);
        }
    }
};