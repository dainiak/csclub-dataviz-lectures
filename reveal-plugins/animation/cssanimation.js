/*
    Reveal.js basic CSS animation plugin
    Author: Alex Dainiak
    Author's webpage: www.dainiak.com
    Email: dainiak@gmail.com
    Plugin is hosted on GitHub:
 */


(function() {
    if(!String.prototype.includes){
        String.prototype.includes = function(s){return this.indexOf(s) >= 0}
    }
    if(!String.prototype.startsWith){
        String.prototype.startsWith = function(s){return this.indexOf(s) == 0}
    }
    if(!String.prototype.endsWith){
        String.prototype.endsWith = function(s){return this.lastIndexOf(s) == this.length - s.length}
    }

    var defaultTransitionDuration =
        Reveal.getConfig().animation && Reveal.getConfig().animation.default_transition_duration !== undefined ?
            Reveal.getConfig().animation.default_transition_duration
        :
            null;

    var globalSubstitutions =
        Reveal.getConfig().animation && Reveal.getConfig().animation.macros ?
            Reveal.getConfig().animation && Reveal.getConfig().animation.macros
        :
            [];

    var animationAtomIdCounter = 0;

    function camelToDashed(s){
        return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }


    /*
        Function parses complex index notation like [1,2,4-9,18-] to explicit Array of numbers
        Means: 1, 2, 4,5,6,7,8,9, 18,19,…
        Returns Array filled with appropriate numbers.
     */
    function parseIndices(str){
        var indices = [];
        var tokens = str.split(',');
        for(var i = 0; i < tokens.length; ++i){
            var token = tokens[i];
            if(token.includes('-')){
                var s = token.split('-');
                var from = parseInt(s[0]);
                var to = s[1].trim();
                if(to){
                    to = parseInt(to);
                    for(var j = from; j <= to; ++j){
                        indices.push(j);
                    }
                }
                else{
                    indices.push(-from);
                }
            }
            else{
                indices.push(parseInt(token));
            }
        }

        return indices;
    }

    function isInList(s, list){
        return list.indexOf(s) >= 0;
    }

    function isKeyword(s){
        const keywords = ['initially', 'during', 'delay', 'apply', 'reset', 'show', 'hide', 'execute', 'next', 'then', 'to', 'rewind', 'macro'];
        return isInList(s, keywords);
    }

    function detectKeywords(tokens){
        var preResult = [];
        for( var i = 0; i < tokens.length; ++i){
            if(tokens[i].content || tokens[i].type == 'string'){
                preResult.push(tokens[i]);
            }
        }
        for( var i = 0; i < preResult.length; ++i){
            if( preResult[i].type == 'word'
                && isKeyword(preResult[i].content)
                && (i == 0
                    || (preResult[i-1].type != 'keyword' || !isInList(preResult[i-1].content, ['apply','to','execute','show','hide', 'macro']) )
                    && preResult[i-1].content != ','
                    && preResult[i-1].content != '='
                    && (i == preResult.length-1 || preResult[i+1].content != '=')) ){
                preResult[i].type = 'keyword';
            }
        }
        for( var i = preResult.length-1; i >= 0; --i){
            if( preResult[i].type != 'string' && preResult[i].content == ';' && (i == preResult.length - 1 || preResult[i+1].type == 'keyword') ){
                preResult[i].type = 'keyword';
            }
        }

        var result = [];
        for( var i = 0; i < preResult.length; ++i){
            if( !(preResult[i].content == ':' && i > 0 && preResult[i-1].type == 'keyword' && (preResult[i-1].content == 'initially' || preResult[i-1].content == 'next' || preResult[i-1].content == 'then') )){
                result.push(preResult[i]);
            }
        }

        return result;
    }


    /*
        Splits string into tokens
    */
    function tokenizeString(s, substitutions){
        var preResult = [{content: '', type: 'word'}];
        while(s){
            if(s.slice(0,2) == '/*'){
                var posEnd = s.indexOf('*/');
                if(posEnd == -1){
                    console.log('Unable to parse: a comment was not closed');
                    return {error: 'Unable to parse: a comment was not closed'};
                }
                s = s.slice(posEnd+2);
                preResult.push({content: '', type: 'word'});
            }
            else if(s.slice(0,3) == '"""' || s.slice(0,3) == "'''"){
                var quot = s[0].repeat(3);
                s = s.slice(quot.length);
                var posEnd = s.indexOf(quot);
                if(posEnd == -1){
                    console.log('Unable to parse: a string literal starting with ' + quot + ' was not closed');
                    return {error: 'Unable to parse: a string literal starting with ' + quot + ' was not closed'};
                }
                preResult.push({content: s.slice(0,posEnd), type: 'string'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(posEnd+quot.length);
            }
            else if(s[0] == '"' || s[0] == "'"){
                var quot = s[0];
                s = s.slice(quot.length);
                var posEnd = s.indexOf(quot);
                if(posEnd == -1){
                    console.log('Unable to parse: a string literal starting with ' + quot + ' was not closed');
                    return {error: 'Unable to parse: a string literal starting with ' + quot + ' was not closed'};
                }
                preResult.push({content: s.slice(0,posEnd), type: 'string'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(posEnd+quot.length);
            }
            else if(s[0] == '[' && s.search(/^\[(\d+\s*(-\s*\d+)?\s*,)*(\d+\s*(-\s*\d*)?\s*)]/) == 0){
                var posEnd = s.indexOf(']');
                preResult.push({content: parseIndices(s.slice(1,posEnd).replace(/\s/g,'')), type: 'indices'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(posEnd+1);
            }
            else if(s[0] == ',' || s[0] == ':' || s[0] == ';' || s[0] == '='){
                preResult.push({content: s[0], type: 'word'});
                preResult.push({content: '', type: 'word'});
                s = s.slice(1);
            }
            else if(s.search(/^\s+/) == 0){
                preResult.push({content: '', type: 'word'});
                var posNonSpace = s.search(/\S/);
                posNonSpace = posNonSpace >= 0 ? posNonSpace : s.length;
                s = s.slice(posNonSpace);
            }
            else{
                preResult[preResult.length-1].content += s[0];
                s = s.slice(1);
            }
        }

        var result = [];
        for( var i = 0; i < preResult.length; ++i){
            if(preResult[i].content || preResult[i].type == 'string'){
                result.push(preResult[i]);
            }
        }

        substitutions = substitutions ? substitutions : globalSubstitutions;

        var localSubstitutions = [];
        var resultWithoutMacroCommands = [];
        for (var i = 0; i < result.length; ++i){
            if(i <= result.length - 4 && result[i].type != 'string' && result[i].content == 'macro'
                && ( result[i+1].type == 'string' || result[i+1].type == 'word' )
                && result[i+2].type != 'string' && result[i+2].content == '='
                && result[i+3].type == 'string'){
                localSubstitutions.push([result[i+1].content, result[i+3].content]);
                i += 3;
            }
            else{
                resultWithoutMacroCommands.push(result[i]);
            }
        }

        substitutions = localSubstitutions.concat(substitutions);

        if(substitutions.length > 0) {
            var finalResult = [];
            substitutionLoop: for(var i = 0; i < resultWithoutMacroCommands.length; ++i){
                if(resultWithoutMacroCommands[i].type != 'word'){
                    finalResult.push(resultWithoutMacroCommands[i]);
                }
                else{
                    for(var j = 0; j < substitutions.length; ++j){
                        if(resultWithoutMacroCommands[i].content == substitutions[j][0]){
                            var tokenList = tokenizeString(substitutions[j][1], substitutions);
                            for (var k = 0; k < tokenList.length; ++k){
                                finalResult.push(tokenList[k]);
                            }
                            continue substitutionLoop;
                        }
                    }
                    finalResult.push(resultWithoutMacroCommands[i]);
                }
            }

            return finalResult;
        }

        return resultWithoutMacroCommands;
    }


    function splitTokenList(list, keyword){
        var result = [];
        var lastSplitPos = -1;
        for(var i = 0; i < list.length; ++i){
            if(list[i].type == 'keyword' && list[i].content == keyword){
                result.push(list.slice(lastSplitPos+1, i));
                lastSplitPos = i;
            }
        }
        result.push(list.slice(lastSplitPos+1));
        return result;
    }

    function listToString(x){
        if(typeof(x) == 'string'){
            return '"' + x.toString() + '"';
        }
        else if(typeof(x) == 'number'){
            return x.toString();
        }
        else if (x && x.length){
            var r = '';
            for (var i = 0; i < x.length; ++i){
                if(r){
                    r += ', ';
                }
                r += listToString(x[i]);
            }
            return '[' + r + ']';
        }
        else if (typeof(x) == 'object'){
            var r = '';
            for( var p in x ){
                if(r){
                    r += ', ';
                }
                r += p.toString() + ': ' + listToString(x[p]);
            }
            return '{' + r + '}';
        }
        else{
            return '???';
        }
    }

    function smartAlert(x){
        alert(listToString(x));
    }


    function getTime(tokenList){
        var timeString = '';
        while( tokenList.length > 0 && timeString.search(/^\d+([.,]\d+)?m?s/) == -1 && isInList(tokenList[0].type,['word','string'])){
            timeString += tokenList[0].content;
            tokenList = tokenList.slice(1);
        }
        if(timeString.search(/^\d+([.,]\d+)?m?s/) == -1){
            timeString = '0';
        }

        timeString = timeString.replace(',', '.').toLowerCase();
        var time = parseFloat(timeString);
        if( !timeString.endsWith('ms') ){
            time *= 1000;
        }

        return { time: time, rest: tokenList };
    }

    /*
        Parses CSS queries with optional index filters (see also parseIndices function)
     */
    function getCssQuery(tokenList){
        var query = '';
        var indices;
        while(tokenList.length > 0 && isInList( tokenList[0].type, ['word', 'string'])){
            if(query){
                query += ' ';
            }
            query += tokenList[0].content;
            tokenList = tokenList.slice(1);
        }

        if( tokenList.length > 0 && tokenList[0].type == 'indices' ){
            indices = tokenList[0].content;
            tokenList = tokenList.slice(1);
        }

        if(!query){
            query = '*';
        }
        return indices ? { query: query, rest: tokenList, indices: indices } : { query: query, rest: tokenList };
    }


    function getNextAnimationAtom(animationAtomScript){
        while( animationAtomScript.length > 0 &&
            (animationAtomScript[0].type != 'keyword'
            || !isInList(animationAtomScript[0].content, ['show','hide','execute','apply','reset']) )){
            animationAtomScript = animationAtomScript.slice(1);
        }
        if (animationAtomScript.length == 0 ){
            return {parsedAtom: null, rest: []};
        }

        var parsedAnimationAtom = {animationType: animationAtomScript[0].content};

        if( animationAtomScript[0].content == 'reset' ){
            parsedAnimationAtom.animationType = 'reset';
            var queryAndRest = getCssQuery(animationAtomScript.slice(1));
            animationAtomScript = queryAndRest.rest;
            parsedAnimationAtom.objectQueryString = queryAndRest.query;
            if(queryAndRest.indices){
                parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
            }
        }
        else if( isInList(animationAtomScript[0].content, ['show', 'hide']) ){
            var queryAndRest = getCssQuery(animationAtomScript.slice(1));
            animationAtomScript = queryAndRest.rest;
            parsedAnimationAtom.objectQueryString = queryAndRest.query;
            if(queryAndRest.indices){
                parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
            }
        }
        else if( animationAtomScript[0].content == 'execute' ){
            animationAtomScript = animationAtomScript.slice(1);
            if(animationAtomScript.length > 0 ) {
                if (animationAtomScript[0].type == 'string') {
                    parsedAnimationAtom.code = animationAtomScript[0].content;
                }
                else if (animationAtomScript[0].type == 'word'){
                    parsedAnimationAtom.code = animationAtomScript[0].content + '();';
                }
                animationAtomScript = animationAtomScript.slice(1);
            }
        }
        else if( animationAtomScript[0].content == 'apply' ){
            parsedAnimationAtom.animationType = 'apply';
            animationAtomScript = animationAtomScript.slice(1);
            while( animationAtomScript.length > 0 && !isInList(animationAtomScript[0].type, ['keyword','indices']) ){
                while(animationAtomScript.length > 0 && animationAtomScript[0].content == ','){
                    animationAtomScript = animationAtomScript.slice(1);
                }
                if(animationAtomScript.length > 1 && animationAtomScript[1].content == '=' ){
                    var property = animationAtomScript[0].content;
                    var value = '';
                    animationAtomScript = animationAtomScript.slice(2);
                    if(animationAtomScript.length > 0 && animationAtomScript[0].type == 'string' ){
                        value = animationAtomScript[0].content;
                        animationAtomScript = animationAtomScript.slice(1);
                    }
                    else {
                        while( animationAtomScript.length > 0 && animationAtomScript[0].content != ',' && isInList(animationAtomScript[0].type, ['string', 'word'])
                            && (animationAtomScript.length == 1 || animationAtomScript[1].content != '=') ){
                            if(value){
                                value += ' ';
                            }
                            value += animationAtomScript[0].content;
                            animationAtomScript = animationAtomScript.slice(1);
                        }
                    }

                    if(!parsedAnimationAtom.propertiesToAssign){
                        parsedAnimationAtom.propertiesToAssign = [];
                    }
                    parsedAnimationAtom.propertiesToAssign.push([property,value]);
                }
                else if(animationAtomScript.length > 0 && isInList(animationAtomScript[0].type, ['string', 'word'])){
                    if(animationAtomScript[0].content.startsWith('-')){
                        if(!parsedAnimationAtom.classesToRemove){
                            parsedAnimationAtom.classesToRemove = [];
                        }
                        parsedAnimationAtom.classesToRemove.push(animationAtomScript[0].content.slice(1));
                    }
                    else if(animationAtomScript[0].content.startsWith('^')){
                        if(!parsedAnimationAtom.classesToToggle){
                            parsedAnimationAtom.classesToToggle = [];
                        }
                        parsedAnimationAtom.classesToToggle.push(animationAtomScript[0].content.slice(1));
                    }
                    else{
                        if(!parsedAnimationAtom.classesToAdd){
                            parsedAnimationAtom.classesToAdd = [];
                        }
                        parsedAnimationAtom.classesToAdd.push(animationAtomScript[0].content);
                    }
                    animationAtomScript = animationAtomScript.slice(1);
                }
                else {
                    animationAtomScript = animationAtomScript.slice(1);
                }
            }
            if (animationAtomScript.length > 0){
                if( animationAtomScript[0].content == 'to'){
                    animationAtomScript = animationAtomScript.slice(1);
                }
                var queryAndRest = getCssQuery(animationAtomScript);
                animationAtomScript = queryAndRest.rest;
                parsedAnimationAtom.objectQueryString = queryAndRest.query;
                if(queryAndRest.indices){
                    parsedAnimationAtom.objectQueryIndices = queryAndRest.indices;
                }
            }
        }

        if(animationAtomScript.length > 0 && animationAtomScript[0].content == 'during'){
            var timeAndRest = getTime(animationAtomScript.slice(1));
            parsedAnimationAtom.duration = timeAndRest.time;
            animationAtomScript = timeAndRest.rest;
        }

        if(animationAtomScript.length > 0 && animationAtomScript[0].content == 'delay'){
            var timeAndRest = getTime(animationAtomScript.slice(1));
            parsedAnimationAtom.delay = timeAndRest.time;
            animationAtomScript = timeAndRest.rest;
        }

       if(animationAtomScript.length > 1
            && animationAtomScript[0].type == 'keyword'
            && animationAtomScript[0].content == 'rewind'){
            animationAtomScript = animationAtomScript.slice(1);
            if(animationAtomScript.length > 1 && animationAtomScript[0].type == 'string'){
                parsedAnimationAtom.rewindScript = parseAnimationRawScript(detectKeywords(tokenizeString(animationAtomScript[0].content)));
                animationAtomScript = animationAtomScript.slice(1);
            }
        }

        return {parsedAtom: parsedAnimationAtom, rest: animationAtomScript}
    }



    /*
        Parses animation script that has to be performed on a single mouse click.
        Returns Array with single animation steps as elements. Steps are supposed to be performed
            one after another, each new step starts after previous finishes.
        Animation step is an array of "animation atoms". They must be performed simultaneously.
        Animation atom is an object containing all necessary information about what DOM nodes to alter
            and how to alter them.
     */
    function parseAnimationRawScript(rawScript){
        var sequenceStepScripts = splitTokenList(rawScript, 'then');
        var parsedAnimation = [];

        for(var i = 0; i < sequenceStepScripts.length; ++i){
            var sequenceStepScript = sequenceStepScripts[i];
            var parsedSequenceStep = [];
            while(sequenceStepScript.length > 0){
                var atomAndRest = getNextAnimationAtom(sequenceStepScript);
                var parsedAnimationAtom = atomAndRest.parsedAtom;
                if(parsedAnimationAtom){
                    parsedAnimationAtom.id = animationAtomIdCounter++;
                    parsedSequenceStep.push(parsedAnimationAtom);
                }
                sequenceStepScript = atomAndRest.rest;
            }

            parsedAnimation.push( parsedSequenceStep );
        }
        return parsedAnimation;
    }


    function castCSS(t){
        var newStyle = document.createElement('style');
        newStyle.innerHTML = t;
        document.head.appendChild(newStyle);
        return newStyle;
    }
    function underlineNode(nodeQuery){
        var styleText = ".animated-underline {display: inline-block;}  .animated-underline:after {content: '';display: block;margin-top: -5px;height: 3px;width: 0;background: transparent;transition: width .5s ease, background-color .5s ease;}  .animated-underline.fire:after {width: 100%;background: #068ee9;};";
        castCSS(styleText);
        var node = document.querySelector(nodeQuery);
        setTimeout(function (){node.classList.add('animated-underline');
        node.classList.add('fire');}, 100);
    }
    /*
        Perform the animation.
     */
    function playAnimation(animationSequence, scope, ignoreDelay, noBackup){
        if( !scope ){
            scope = document;
        }
        for (var nStep = 0; nStep < animationSequence.length; ++nStep){
            var animationStepAtoms = animationSequence[nStep];
            var animationStepDuration = 0.0;
            for (var i = 0; i < animationStepAtoms.length; ++i){
                var animationAtom = animationStepAtoms[i];

                var totalAtomCompletionTime = 0.0;
                if(animationAtom.duration){
                    totalAtomCompletionTime += animationAtom.duration;
                }
                if(animationAtom.delay){
                    totalAtomCompletionTime += animationAtom.delay;
                }

                animationStepDuration = Math.max(animationStepDuration, totalAtomCompletionTime);

                if(animationAtom.delay > 0 && !ignoreDelay){
                    setTimeout(
                        function(){  playAnimation([[animationAtom]], scope, true)  },
                        animationAtom.delay
                    );
                    continue;
                }

                if (animationAtom.animationType == 'execute') {
                    eval(animationAtom.code);
                    continue;
                }

                var animationObjectsUnfiltered = scope.querySelectorAll( animationAtom.objectQueryString );
                var animationObjects = [];
                for(var j = 0; j < animationObjectsUnfiltered.length; ++j){
                    if(!animationObjectsUnfiltered[j].classList.contains('custom-animation-carrier') && animationObjectsUnfiltered[j].tagName.toLowerCase() != 'script'){
                        animationObjects.push(animationObjectsUnfiltered[j]);
                    }
                }
                if(animationObjects.length == 0 && animationAtom.objectQueryString == '*'){
                    animationObjects = [scope];
                }

                for (var j = 0; j < animationObjects.length; ++j){
                    if( animationAtom.objectQueryIndices && animationAtom.objectQueryIndices.indexOf(j) < 0
                        && (animationAtom.objectQueryIndices[animationAtom.objectQueryIndices.length-1] >= 0
                            || j < -animationAtom.objectQueryIndices[animationAtom.objectQueryIndices.length-1]) ){
                        continue;
                    }

                    var node = animationObjects[j];
                    var animationType = animationAtom.animationType;

                    if(animationAtom.duration !== undefined){
                        node.style.transitionDuration = animationAtom.duration.toString() + 'ms';
                    }
                    else if(defaultTransitionDuration){
                        node.style.transitionDuration = defaultTransitionDuration;
                    }

                    if(animationType == 'reset'){
                        for(var p in node.dataset){
                            if(p.startsWith('animationInitialBackup')){
                                var parameter = camelToDashed(p);
                                parameter = parameter.slice('animation-initial-backup-'.length);
                                if(parameter.startsWith('class-')){
                                    parameter = parameter.slice('class-'.length);
                                    if(node.dataset[p] == 'true'){
                                        node.classList.add(parameter);
                                    }
                                    else{
                                        node.classList.remove(parameter);
                                    }
                                }
                                else if(parameter.startsWith('general-')){
                                    parameter = parameter.slice('general-'.length);
                                    node.setAttribute(parameter, node.dataset[p]);
                                }
                                else{
                                    node.style[parameter] = node.dataset[p];
                                }
                            }
                            else if(p.search(/^dataAnimation\d+Backup/) == 0){
                                node.removeAttribute(camelToDashed(p));
                            }
                        }
                    }
                    if(animationType == 'show') {
                        animationType = 'apply';
                        animationAtom.propertiesToAssign = [];
                        if(node.style.visibility != 'visible'){
                            animationAtom.propertiesToAssign.push(['visibility','visible']);
                        }
                        if(node.style.opacity == '0'){
                            animationAtom.propertiesToAssign.push(['opacity','1']);
                        }
                    }
                    if(animationType == 'hide') {
                        animationType = 'apply';
                        animationAtom.propertiesToAssign = [];
                        if(node.style.visibility != 'hidden'){
                            if(animationAtom.duration > 0){
                                animationAtom.propertiesToAssign.push(['opacity','0']);
                            }
                            else{
                                animationAtom.propertiesToAssign.push(['visibility','hidden']);
                            }

                        }
                    }
                    if(animationType == 'apply'){
                        var classesToAdd = animationAtom.classesToAdd;
                        var classesToRemove = animationAtom.classesToRemove;
                        var classesToToggle = animationAtom.classesToToggle;
                        var propertiesToAssign = animationAtom.propertiesToAssign;
                        if(classesToAdd){
                            for(var k = 0; k < classesToAdd.length; ++k){
                                var cls = classesToAdd[k];
                                var backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(backupAttr)){
                                    node.setAttribute(backupAttr, node.classList.contains(cls));
                                }
                                var initialBackupAttr = 'data-animation-initial-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                    node.setAttribute(initialBackupAttr, node.classList.contains(cls));
                                }
                                node.classList.add(cls);
                            }
                        }
                        if(classesToRemove){
                            for(var k = 0; k < classesToRemove.length; ++k){
                                var cls = classesToRemove[k];
                                var bakupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(bakupAttr)){
                                    node.setAttribute(bakupAttr, node.classList.contains(cls));
                                }
                                var initialBackupAttr = 'data-animation-initial-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                    node.setAttribute(initialBackupAttr, node.classList.contains(cls));
                                }
                                node.classList.remove(cls);
                            }
                        }
                        if(classesToToggle){
                            for(var k = 0; k < classesToToggle.length; ++k){
                                var cls = classesToToggle[k];
                                var backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(backupAttr)){
                                    node.setAttribute(backupAttr, node.classList.contains(cls));
                                }
                                var initialBackupAttr = 'data-animation-initial-backup-class-' + cls;
                                if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                    node.setAttribute(initialBackupAttr, node.classList.contains(cls));
                                }
                                node.classList.remove(cls);
                            }
                        }
                        if(propertiesToAssign){
                            for(var k = 0; k < propertiesToAssign.length; ++k){
                                var property = propertiesToAssign[k][0];
                                var value = propertiesToAssign[k][1];
                                if(property[0] == '*'){
                                    property = property.slice(1);
                                    var backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-general-' + property;
                                    if(!noBackup && !node.hasAttribute(backupAttr)){
                                        node.setAttribute(backupAttr, node.getAttribute(property));
                                    }
                                    var initialBackupAttr = 'data-animation-initial-backup-general-' + property;
                                    if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                        node.setAttribute(initialBackupAttr, node.getAttribute(property));
                                    }
                                    node.setAttribute(property, value);
                                }
                                else{
                                    var backupAttr = 'data-animation' + animationAtom.id.toString() + '-backup-' + property;
                                    if(!noBackup && !node.hasAttribute(backupAttr)){
                                        node.setAttribute(backupAttr, node.style[property]);
                                    }
                                    var initialBackupAttr = 'data-animation-initial-backup-' + property;
                                    if(!noBackup && !node.hasAttribute(initialBackupAttr)){
                                        node.setAttribute(initialBackupAttr, node.style[property]);
                                    }
                                    node.style[property] = value;
                                }
                            }
                        }
                    }
                }
            }

            if(animationStepDuration > 0){
                var remainingSteps = animationSequence.slice(nStep + 1);
                setTimeout(
                    function(){  playAnimation(remainingSteps, scope, false)  },
                    animationStepDuration
                );
                return;
            }
        }
    }

    /*
        Reverse the animation.
    */
    function rewindAnimation(animationSequence, scope){
        for(var i = animationSequence.length-1; i >= 0 ; --i){
            for(var j = animationSequence[i].length-1; j >= 0 ; --j){
                var animationAtom = animationSequence[i][j];
                if(animationAtom.rewindScript){
                    playAnimation(animationAtom.rewindScript, scope, false, true);
                    continue;
                }

                var backupAttrPrefix = 'data-animation' + animationAtom.id.toString() + '-backup-';

                var animationObjectsUnfiltered = scope.querySelectorAll( animationAtom.objectQueryString );
                var animationObjects = [];
                for(var k = 0; k < animationObjectsUnfiltered.length; ++k){
                    if(!animationObjectsUnfiltered[k].classList.contains('custom-animation-carrier') && animationObjectsUnfiltered[k].tagName.toLowerCase() != 'script'){
                        animationObjects.push(animationObjectsUnfiltered[k]);
                    }
                }
                if(animationObjects.length == 0 && animationAtom.objectQueryString == '*'){
                    animationObjects = [scope];
                }

                for (var k = 0; k < animationObjects.length; ++k){
                    var node = animationObjects[k];
                    var oldTransitionDuration = node.style.transitionDuration;
                    node.style.transitionDuration = '0s';

                    if(isInList(animationAtom.animationType, ['apply','show','hide'])){
                        var classes = [];
                        if(animationAtom.classesToAdd){
                            classes = classes.concat(animationAtom.classesToAdd);
                        }
                        if(animationAtom.classesToRemove){
                            classes = classes.concat(animationAtom.classesToRemove);
                        }
                        if(animationAtom.classesToToggle){
                            classes = classes.concat(animationAtom.classesToToggle);
                        }

                        for(var m = 0; m < classes.length; ++m) {
                            var cls = classes[m];
                            if (node.getAttribute(backupAttrPrefix + 'class-' + cls) == 'false') {
                                node.classList.remove(cls);
                            }
                            if (node.getAttribute(backupAttrPrefix + 'class-' + cls) == 'true') {
                                node.classList.add(cls);
                            }
                        }

                        if(animationAtom.propertiesToAssign){
                            for(var m = 0; m < animationAtom.propertiesToAssign.length; ++m){
                                var property = animationAtom.propertiesToAssign[m][0];
                                if(property[0] == '*'){
                                    property = property.slice(1);
                                    if(node.hasAttribute(backupAttrPrefix + 'general-' + property)){
                                        node.setAttribute(property, node.getAttribute(backupAttrPrefix + 'general-' + property));
                                    }
                                }
                                else{
                                    if(node.hasAttribute(backupAttrPrefix + property)){
                                        node.style[property] = node.getAttribute(backupAttrPrefix + property);
                                    }
                                }
                            }
                        }
                    }

                    node.style.transitionDuration = oldTransitionDuration;
                }
            }
        }
    }

    function getParentSlide(node){
        while(node.tagName.toLowerCase() != 'section' && node.tagName.toLowerCase() != 'body'){
            node = node.parentNode;
        }
        return node;
    }

    function getFragmentForScript(scriptNode){
        if(scriptNode.hasAttribute('data-fragment')){
            var indexRegExp = /\[\s*\d+\s*]\s*$/;
            var query = scriptNode.getAttribute('data-fragment');
            var indexPosition = query.search(indexRegExp);
            if(indexPosition >= 0){
                var index = parseInt(query.slice(indexPosition + 1));
                query = query.replace(indexRegExp, '');
                query = query.replace(/\s*$/g, '');
                if(!query.endsWith('.fragment')){
                    query += '.fragment';
                }
                return getParentSlide(scriptNode).querySelectorAll(query)[index];
            }
            else{
                if(query){
                    if(!query.endsWith('.fragment')){
                       query += '.fragment';
                    }
                    return getParentSlide(scriptNode).querySelector(query);
                }
                if(scriptNode.parentNode.classList.contains('fragment')){
                    return scriptNode.parentNode;
                }
                var sibling = scriptNode.previousSibling;
                while( sibling && !sibling.classList ) {
                    sibling = sibling.previousSibling;
                }
                if(sibling && sibling.classList.contains('fragment')){
                    return sibling;
                }
                sibling = scriptNode.nextSibling;
                while( sibling && !sibling.classList ) {
                    sibling = sibling.nextSibling;
                }
                if(sibling && sibling.classList.contains('fragment')){
                    return sibling;
                }
            }
        }
        return null;
    }

    function createVirtualCarrierForAnimation(anim){
        var carrier = document.createElement('a');
        carrier.classList.add('fragment');
        carrier.classList.add('custom-animation-carrier');
        carrier['data-custom-animation-carrier'] = anim;
        return carrier;
    }

    function insertAfter(referenceNode, newNode){
        referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling)
    }

    function initializeAnimationsOnPage(){
        var animations = document.querySelectorAll('script[type="text/animation"]');
        var initialSettings = [];

        for(var i = 0; i < animations.length; ++i){
            var animScriptDomElement = animations[i];
            var slide = getParentSlide(animScriptDomElement);
            var fragment = getFragmentForScript(animScriptDomElement);
            var animScripts = splitTokenList(detectKeywords(tokenizeString(animScriptDomElement.textContent)), 'next');

            for(var j = 0, lastAnimCarrier = animScriptDomElement; j < animScripts.length; ++j) {
                var animationRawScript = animScripts[j];
                if(j == 0 && animationRawScript.length > 0 && animationRawScript[0].content == 'initially'){
                    var animationScript = parseAnimationRawScript(animationRawScript.slice(1));
                    var scope = animScriptDomElement.parentNode;

                    initialSettings.push({
                        slide: slide,
                        animation: animationScript,
                        scope: scope
                    });
                    continue;
                }

                var animation = parseAnimationRawScript(animationRawScript);
                if(fragment && j == 0){
                        fragment['data-custom-animation-carrier'] = animation;
                        lastAnimCarrier = fragment;
                }
                else{
                    var newNode = createVirtualCarrierForAnimation(animation);
                    insertAfter(lastAnimCarrier, newNode);
                    lastAnimCarrier = newNode;
                }
            }
        }

        if(animations.length > 0){
            Reveal.addEventListener('fragmentshown', function (event) {
                if (event.fragment['data-custom-animation-carrier']){
                    playAnimation(event.fragment['data-custom-animation-carrier'], event.fragment.parentNode, false);
                }
            });
            Reveal.addEventListener('fragmenthidden', function (event) {
                if (event.fragment['data-custom-animation-carrier']){
                    rewindAnimation(event.fragment['data-custom-animation-carrier'], event.fragment.parentNode);
                }
            });

            if(initialSettings.length > 0){
                function initializer(event){
                    for(var i = 0; i < initialSettings.length; ++i){
                        if( event.currentSlide == initialSettings[i].slide ){
                            Reveal.navigateFragment(-1);
                            playAnimation(initialSettings[i].animation, initialSettings[i].scope, false);
                            break;
                        }
                    }
                }
                Reveal.addEventListener('slidechanged', initializer);
            }
        }
    }

    initializeAnimationsOnPage();
})();